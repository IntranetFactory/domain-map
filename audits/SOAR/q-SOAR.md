# Security Orchestration, Automation and Response (SOAR): questions waiting for you

## What this domain is
Turn security alerts into automated, repeatable response with playbooks that act across all your security tools. Authors design playbooks once, the orchestrator runs them against every connected tool when an incident fires, and analysts work the resulting cases from open through containment to close. The product is the engine that executes the orchestrated steps, with a full audit trail of every automated run.

---

q1: (answer this first) Before building SOAR, should we run formal vendor research, or build straight from the agent's proposed module shape?

- a) Vetted route: run a formal vendor-research pass against the leading SOAR vendor public docs, save the result, then build.
- b) Eyeball route: accept the agent's proposed 3-module split (Playbook Authoring, Automation Runtime, Case Management) and build now.
- c) Defer the build entirely until the vendor-research pass lands.

Recommended: a. The leading SOAR vendors (alert-centric, playbook-centric, and workflow-DAG-centric) diverge enough in their schemas that building from an eyeball guess would mis-shape the modules. This choice gates the whole build, so it unlocks everything else.

a1:

---

q2: SOAR's business description still contains a forbidden em-dash character. Should I rewrite it to remove the em-dash (replacing it with a sentence break, no other change)? (yes/no)

Recommended: yes. The em-dash is forbidden project-wide. This overwrites a non-empty value, so it needs your sign-off; the rewrite is a mechanical character swap only.

a2:

---

q3: SOAR is currently owned only by the Security Operations Center. Should we add any other business functions, and in what role?

- a) Add Risk and Compliance as a contributor.
- b) Add IT Operations as a consumer.
- c) Add both.
- d) Leave as-is (SOC ownership is sufficient).

Recommended: a or c. Regulated buyers usually enforce Risk and Compliance sign-off given the SEC 4-day disclosure clock and breach-notification laws; mature SOCs run SOAR autonomously and may prefer (d). Low stakes, does not block the build.

a3:

---

q4: Should we record SEC 8-K cyber-incident disclosure and state breach-notification statutes as regulations applicable to SOAR?

- a) Add SEC 8-K plus state breach-notification statutes (as buyer-side inherited applicability).
- b) Add only SEC 8-K.
- c) Add none (these belong on the producing domains, not on SOAR).
- d) Surface as analytics only, no catalog rows.

Recommended: a. SOAR is not the regulator's target, but it is structurally what enforces the disclosure clock and produces the required audit trail, so recording inherited applicability helps downstream filtering. Editorial, does not block the build.

a4:

---

<!-- agent map, ignore: q1=B2-S3 q2=B1A-RULE-EMDASH q3=B2-S1 q4=B2-S2 | domain_id=12 -->
