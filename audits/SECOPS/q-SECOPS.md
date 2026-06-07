# Security Operations (SECOPS): questions waiting for you

## What this domain is
The security operations umbrella: the place where alerts, incidents, and investigations from your detection tools come together so the SOC can see, run, and close the loop on security events. It triages and correlates signals across sources, drives investigation and containment, and tracks the regulator-notification clock through to recovery. It sits above its already-wired children (SOAR, vulnerability management, threat intelligence) and consumes incident feeds from data-loss and data-security tooling.

---

q1: (answer this first) How should Security Operations be classified, which decides whether it owns its own data or just coordinates over other domains?

- a) Keep it as a leadership-tier overlay: author a single SECOPS-LANDING module, master nothing, and declare consumer links over the masters in ITSM (service incidents), ITOM (monitoring events), DLP (data-loss incidents), and DSPM (sensitive-data incidents).
- b) Promote it to a master-bearing umbrella: author SECOPS-CASE-MGMT, SECOPS-DETECTION-ENG, SECOPS-RESPONSE-OPS, and SECOPS-IR-COMPLIANCE modules, and master the 14 candidate entities listed in the Optional section.
- c) Hybrid: author SECOPS-LANDING and SECOPS-CASE-MGMT now (mastering security incidents plus 2 to 3 related entities), and defer the detection-engineering and response-ops modules until the SIEM and EDR sibling domains land.

Recommended: c. The flagship security-operations products master first-class case, alert, and detection schemas, which argues against a pure overlay, but the catalog already wires SOAR, vulnerability management, and threat intelligence as children, which is overlay-shaped. The hybrid lands the case shape now while leaving the detection boundary open. This choice gates the entire build (modules, capabilities, masters, the system skill, the handoff backfill, and all 14 Optional candidates), so it unlocks everything below it.

a1:

---

q2: Should the detection verticals (SIEM, EDR, XDR, MDR, NDR, UEBA, DFIR, BAS, SOC-AAS) be modeled as flat top-level domains, or as children wired under Security Operations?

- a) Load them as flat top-level domains with no parent-child link, and have the SECOPS umbrella consume from each.
- b) Load them as children of SECOPS, mirroring the existing SOAR, vulnerability-management, and threat-intelligence wiring.
- c) Defer until you pick the 2 to 3 highest-priority verticals (SIEM, EDR, XDR is the minimum coherent set) and load them in a focused wave.

Recommended: b. Both the catalog precedent (the ITAM umbrella) and the existing umbrella-to-children wiring already in place point at the parent-child shape.

a2:

---

q3: Where should playbook executions and containment actions be canonically owned, given SOAR is already a separate child domain?

- a) SOAR owns playbook executions and containment actions; SECOPS consumes or embeds them.
- b) SECOPS owns the case-correlated execution; SOAR owns the orchestration engine itself (rule library, connector catalog, workflow templates).
- c) Consolidate SOAR into SECOPS as a module. This deprecates the existing SOAR domain row and is destructive, so it needs your explicit sign-off.

Recommended: a. SOAR is already a separate child domain, so letting it keep these masters avoids duplicating its scope inside a SECOPS response module. Option (c) is destructive and would not be done without your approval.

a3:

---

q4: Does the existing parent-child wiring already in the catalog (SOAR, vulnerability management, and threat intelligence all set as children of SECOPS) change your answer to q1 or q2?

- a) The existing umbrella-to-children evidence pushes toward the overlay shape in q1, since the catalog already says SECOPS is a parent rather than a peer.
- b) It argues for promoting more detection verticals as children before settling q1.
- c) It mainly informs q3, since SOAR is already declared a child and a SECOPS response module would duplicate that scope.

Recommended: c. The wiring is concrete evidence about SOAR specifically, so it most directly sharpens the response-ops overlap question rather than overturning the classification call.

a4:

---

q5: The Security Operations business-logic description still contains a forbidden em-dash before "the SIEM/EDR core". Should I replace it with a comma? (yes/no)

Recommended: yes. It is a single-character hygiene fix that brings the field in line with the project em-dash ban. It overwrites a non-empty analyst-authored value, so it needs your confirmation before I apply it.

a5:

---

## Optional (will not hold up the build)

q6: If you promote or go hybrid in q1, should I research and add the candidate master entities that hold up against the flagship vendor surface (security incidents, security cases, security alerts, detections, detection rules, playbook executions, containment actions, MITRE ATT&CK tags, investigation timelines, evidence artifacts, regulator notifications, breach-clock entries, NIS2 significant-incident reports, DORA major-incident reports)? (yes/no)

Recommended: yes, but additive and only after the module shape from q1 lands; each candidate still wants a vendor-research vetting pass first.

a6:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-5 q5=B1A-D1 q6=B3-SECURITY-INCIDENTS+B3-SECURITY-CASES+B3-SECURITY-ALERTS+B3-DETECTIONS+B3-DETECTION-RULES+B3-PLAYBOOK-EXECUTIONS+B3-CONTAINMENT-ACTIONS+B3-MITRE-ATTACK-TAGS+B3-INVESTIGATION-TIMELINES+B3-EVIDENCE-ARTIFACTS+B3-REGULATOR-NOTIFICATIONS+B3-BREACH-CLOCK-ENTRIES+B3-NIS2-INCIDENT-REPORTS+B3-DORA-INCIDENT-REPORTS | domain_id=11 -->
