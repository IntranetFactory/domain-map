# Vulnerability Management (VULN-MGMT): questions waiting for you

## What this domain is
Find every vulnerability in your environment, prioritize the ones that matter, and route remediation to the team that owns the fix.

Identification, prioritization, and remediation of security vulnerabilities across endpoints, cloud, and applications. Discover assets and scan them, match findings to CVEs and enrich them with threat intelligence, score the real risk so the urgent items rise to the top, and drive each fix to closure with exceptions and risk-acceptance handled cleanly.

---

q1: (answer this first) How should Vulnerability Management be split into modules? The build adopted a 3-module split: Scanning and Detection (vulnerability_scans, vulnerabilities, vulnerability_definitions), Prioritization and Risk (vulnerability_assessments plus the ranking lens), and Remediation and Governance (vulnerability_remediations, vulnerability_exceptions, verification, compliance evidence).

- a) Three modules: Scanning and Detection + Prioritization and Risk + Remediation and Governance (built).
- b) Two modules: collapse detection and prioritization into one find-and-rank module + Remediation and Governance.
- c) Four modules: also split Compliance Evidence out of Remediation into its own module.

Recommended: a. Every flagship suite separates the scanning/detection engine from the prioritization lens from the remediation loop. Tenable splits Nessus / Tenable Vulnerability Management (scanning) from Tenable One exposure scoring (prioritization) from its remediation workflow; Qualys literally names the stages V-M-D-R (Vulnerability, Detection, then TruRisk prioritization, then Response/remediation); Rapid7 InsightVM ships scan engines and templates separately from Remediation Projects; Microsoft Defender Vulnerability Management separates Weaknesses/scanning from Security Recommendations from Remediation activities; CrowdStrike Falcon Spotlight feeds Falcon Fusion for remediation; Wiz separates scans from its prioritization graph from remediation steps. Avoid (b): no flagship sells find-and-rank as a single fused product. Avoid (c): compliance is reporting over remediation data (scanning cadence, MTTR, exception approvals), not a standalone master, so no vendor packages it as its own module; it stays inside Remediation.

a1:

---

q2: Should remediation work be mastered inside Vulnerability Management (as built) with an outbound handoff to your service desk, or handed entirely to ITSM?

- a) Master vulnerability_remediations here as the security-side workflow (built), and add an outbound handoff (vulnerability_remediation.assigned to ITSM) so fixes executed through the service desk are tracked there too.
- b) Do not master remediation here at all; create only ITSM tickets and read their status back.
- c) Master here and never integrate with ITSM.

Recommended: a. Flagship VM vendors master their own remediation/response entity even while integrating with ServiceNow. Tenable Vulnerability Management has its own remediation recommendations plus a ServiceNow connector; Qualys VMDR ships Patch Management and its own remediation tickets while also pushing to ServiceNow; Rapid7 InsightVM owns Remediation Projects and syncs them to ITSM; Microsoft Defender Vulnerability Management owns Remediation activities and hands execution to Intune/ServiceNow; CrowdStrike Falcon Spotlight routes through Falcon Fusion. The one inverse case is ServiceNow Vulnerability Response, which lives natively inside ITSM, so there the security view and the ticket are the same record. The real trade-off: mastering here keeps the prioritized queue, the SLA/MTTR posture view, and the close-the-loop verification re-scan security-owned and independent of whoever applies the patch, at the cost of one extra record to reconcile with the ITSM change/incident; ITSM-only keeps a single record but loses the security posture lens and the verification linkage. The built shape (a) matches Tenable, Qualys, Rapid7, Microsoft, and CrowdStrike. The cross-domain link to ITSM is already loaded; adding the formal handoff is the only piece left because the ITSM-side module FK and trigger event want your sign-off.

a2:

---

q3: Should the CVE knowledge base be mastered here while live exploit intelligence is consumed from your Threat Intelligence domain, and should the inbound exploit-intel handoff be added now or deferred?

- a) Master the static vulnerability_definitions catalog here (built) and consume exploit-prediction / known-exploited signals from THREAT-INTEL via the fetch tool; defer the formal inbound handoff until THREAT-INTEL masters an exploit entity.
- b) Same split, but add the inbound THREAT-INTEL exploit-intel handoff now.
- c) Master all CVE and exploit intelligence here, including live exploitability signals.
- d) Consume the entire definitions catalog from THREAT-INTEL and master nothing here.

Recommended: a. Every flagship VM vendor maintains its own definitions/knowledge base for matching findings: Tenable ships plugins and CVE definitions, Qualys VMDR has the QID Knowledgebase mapped to CVE, Rapid7 has vulnerability checks and CVE references, Microsoft Defender VM has its CVE knowledge base, and CrowdStrike and Wiz carry their own. So the matching catalog belongs here, which rules out (d). But live exploitability signals (EPSS, CISA KEV, exploit-in-the-wild) are a distinct fast-moving market: Tenable VPR and Qualys TruRisk both ingest EPSS and KEV as an external enrichment layer rather than authoring them, which is exactly the Threat Intelligence boundary, so (c) would duplicate a neighbor market. On timing: THREAT-INTEL (domain 14) currently masters no exploit entity, so an inbound handoff added today would point at a payload that does not exist yet. Consume via the tool now (a) and add the formal handoff when THREAT-INTEL is built; pick (b) only if you want the handoff row staged ahead of that.

a3:

---

q4: Should a vulnerability exception (a risk acceptance) lock on submit and require a single accountable approver? (yes/no)

- a) Yes: keep has_submit_lock=true and has_single_approver=true (an exception locks when submitted; changes require a new exception; one risk owner signs off).
- b) Multi-approver committee sign-off instead.
- c) No submit lock (editable after approval).

Recommended: a (yes). Risk acceptances are individually accountable, audit-bearing decisions, and the flagship suites gate them as single-owner sign-off on a locked, time-boxed record. Qualys VMDR exceptions require an approver and expire on a fixed date; Rapid7 InsightVM exceptions carry a reviewer and an expiry; ServiceNow Vulnerability Response deferrals route to a single risk approver with expiry-driven re-review; Tenable and Microsoft Defender Vulnerability Management both gate exceptions on an approver with a time box. None of the flagships make an approved exception editable after the fact, and committee sign-off is the exception rather than the norm for routine risk acceptance. These flags are already set true on the entity; this is the approval gate, not a change.

a4:

---

## Optional (will not hold up the build)

q5: Should I add the inbound Threat Intelligence exploit-intel handoff (EPSS / CISA KEV / exploit-in-the-wild feeding prioritization) once THREAT-INTEL masters an exploit entity? (yes/no)

Recommended: yes, but it is gated on the THREAT-INTEL build. The tool path is already wired (compute and fetch exploit intel); the formal handoff is parked until there is an exploit/KEV payload to point the FK at. Tenable VPR, Qualys TruRisk, Rapid7 Active Risk, and Microsoft Defender threat analytics all consume these signals. Additive, non-blocking.

a5:

---

q6: Should I add the inbound CMDB/ITAM asset-population handoff (a newly discovered configuration item or onboarded hardware asset triggering scan-scope updates)? (yes/no)

Recommended: yes, pending a quick check on which neighbor publishes the asset event. The cross-domain link from vulnerabilities to configuration_items is already loaded; a formal handoff would let new-asset events drive scan scope, as Tenable, Qualys, Rapid7, and Wiz all sync asset inventory. Additive, non-blocking.

a6:

---

q7: Nine-plus extra market-surface objects show up across the flagship VM vendors (scan_policies / scan_templates, exposure_cards / risk snapshots, patches, asset_tags / scan_targets, compliance_checks). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules are confirmed. Scan policies/templates (Tenable scan policies, Qualys option profiles, Rapid7 scan templates), risk snapshots (Tenable exposure cards, Qualys TruRisk, Rapid7 Real Risk), patches (Qualys Patch Management), and compliance checks are common across the vendor set, though each still wants a verification pass first.

a7:

---

q8: Should the prioritization layer be promoted toward a cross-cutting exposure-management (CTEM) surface shared with cloud posture (CSPM), data posture (DSPM), and attack-surface management? (yes/no)

Recommended: yes in principle, but it needs a scoping check first because it reshapes module boundaries (it would become a module/domain decision, not a quiet additive change). Tenable One, Wiz, and Qualys all unify finding-prioritization across vulnerabilities, cloud posture, and attack surface under a continuous-threat-exposure-management framing, so the risk-scoring engine is a genuine cross-domain layer. Additive and non-blocking; flagged as an idea only.

a8:

---

<!-- agent map, ignore: q1=B2-VM-MODULE-SPLIT q2=B2-VM-REMEDIATION-OWNERSHIP q3=B2-VM-CVE-INTEL-SOURCE q4=B2-VM-EXCEPTION-FREEZE q5=B3-VM-EXPLOIT-INTEL-HANDOFF q6=B3-VM-CMDB-ASSET-HANDOFF q7=B3-VM-MARKET-SURFACE q8=B3-VM-EXPOSURE-MGMT-PROMOTION | domain_id=13 -->
