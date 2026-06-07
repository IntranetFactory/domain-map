# Vulnerability Management (VULN-MGMT): questions waiting for you

## What this domain is
Find every vulnerability in your environment, prioritize the ones that matter, and route remediation to the team that owns the fix.

Identification, prioritization, and remediation of security vulnerabilities across endpoints, cloud, and applications. Discover assets and scan them, match findings to CVEs and enrich them with threat intelligence, score the real risk so the urgent items rise to the top, and drive each fix to closure with exceptions and risk-acceptance handled cleanly.

---

q1: (answer this first) What scope should the Vulnerability Management build be?

- a) Full build: the four-module Find / Prioritize / Fix shape with the roughly eight to ten workflow masters (scans, findings, CVEs, risk scores, KEV advisories, remediation tickets, exceptions, scan targets). This matches every flagship vendor.
- b) Lean build: capabilities and modules only, with no masters; remediation records live in dependent domains instead.
- c) Defer to a separate scope-decision conversation.

Recommended: a. Every flagship vendor masters substantial workflow entities, and the overlay test points to a full build. This is the keystone catalog call and it gates the module split, the capabilities, and every optional item below, so it unlocks the rest of the build.

a1:

---

q2: Which module shape should Vulnerability Management use?

- a) Four-module split as drafted: Discovery and Scanning, Findings Management, Risk Prioritization, Remediation Tracking.
- b) Three-module collapse: fold Risk Prioritization into Findings Management.
- c) Five-module split: separate Discovery from Scanning.
- d) Five-module split: add a Compliance Reporting module.
- e) Defer pending formal Phase 0 vendor research.

Recommended: a. The vendor evidence supports a Find / Prioritize / Fix triad, and the four-module split is the cleanest shape that keeps each area ownable. This is an architectural decision you own, and it gates the build.

a2:

---

q3: Should all seven capabilities ship domain-prefixed (VULN-...), or should the two risk capabilities be promoted to cross-cutting so other domains can reuse them?

- a) All seven prefixed (VULN-...).
- b) Promote VULN-RISK-SCORING and VULN-THREAT-CONTEXT to cross-cutting (RISK-BASED-SCORING and THREAT-EXPLOITABILITY-CONTEXT) for reuse on CSPM, DSPM, App-Sec, and EASM.
- c) Defer cross-cutting promotion to a separate pass once the neighbor domains land.

Recommended: b. The cross-cutting convention applies when three or more domains realize the same capability, and CSPM, DSPM, App-Sec, and EASM all share the risk-scoring and exploitability-context engine. This feeds the load shape of the build.

a3:

---

q4: Now that the catalog copy and description are clean, do you want a full Phase 0 description rewrite anchored on the vendor surface, or leave the current text?

- a) Full Phase 0 description rewrite anchored on the vendor surface (no vendor names in the description).
- b) Leave it; the current text plus the new catalog copy is sufficient.

Recommended: b. The current description is clean and the new catalog copy already covers the buyer-facing surface; a full rewrite is a non-blocking editorial nicety.

a4:

---

q5: Four unambiguous synonyms are already loaded (risk-based vulnerability management / RBVM, threat and vulnerability management / TVM, vulnerability response, vuln management). Should the alias slate be extended with the debatable ones?

- a) No extension; the four loaded synonyms are enough.
- b) Add some of VRM (vulnerability response management), TEM (threat exposure management), "weakness management", or the bare acronyms RBVM / TVM as their own search strings (specify which).
- c) Defer the extension.

Recommended: a. The bare acronyms and adjacent-category synonyms risk false-positive catalog matches (TVM collides with Microsoft's framing, VRM with vendor-risk-management), and the unambiguous slate is already live.

a5:

---

## Optional (will not hold up the build)

q6: Should I research and add the eight workflow masters that the flagship vendors all carry (vulnerability scans, vulnerability findings, CVE records, vulnerability risk scores, KEV advisories, remediation tickets, exception records, scan targets)? (yes/no)

Recommended: yes, but additive and gated on the scope decision above; this only makes sense if you choose the full build.

a6:

---

q7: Should I research and tag the five mandatory compliance frameworks for this domain (PCI-DSS 4.0 requirement 11.3, the HIPAA Security Rule scanning and risk-analysis obligations, FedRAMP / NIST 800-53 RA-5 and SI-2, SOX 404 IT general controls, and GDPR Article 32)? (yes/no)

Recommended: yes, but additive and can happen after the modules exist; tag only the ones that apply to your environment.

a7:

---

<!-- agent map, ignore: q1=B2-V1 q2=B2-V2 q3=B2-V3 q4=B2-V4 q5=B2-V6 q6=B3-V1+B3-V2+B3-V3+B3-V4+B3-V5+B3-V6+B3-V7+B3-V8 q7=B3-R1+B3-R2+B3-R3+B3-R4+B3-R5 | domain_id=13 -->
