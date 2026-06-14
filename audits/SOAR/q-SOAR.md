# Security Orchestration, Automation and Response (SOAR): questions waiting for you

## What this domain is
Turn security alerts into automated, repeatable response with playbooks that act across all your security tools. Authors design playbooks once, the orchestrator runs them against every connected tool when an incident fires, and analysts work the resulting cases from open through containment to close. The product is the engine that executes the orchestrated steps, with a full audit trail of every automated run.

---

q1: (answer this first) We have now done the vendor research for SOAR. Should we build straight from the researched module shape below, or do you want to change it? (pick one)

- a) Build the researched 3-module shape now (Playbook Authoring with connectors folded in, Automation Runtime, Case Management with one incident master).
- b) Keep researching / defer the build.
- c) Build a different shape (tell me how in your answer).

What the vendor research found (so you can decide from facts):
- The market is genuinely three-shaped: Splunk SOAR is alert/event-centric (the Container is the headline object), Cortex XSOAR and ServiceNow Security Incident Response are incident-centric (the Incident is the spine, playbooks attach to it), and Tines (Stories) and Torq (Workflows) are workflow-DAG-centric with no required incident at all. There is no single canonical master, so the build names the authoring master generically (security_playbooks, with a workflow/story alias) so the DAG vendors are not second-class.
- Integration connectors are a first-class, independently versioned authored surface, not loose playbook config: Cortex XSOAR Marketplace Content Packs, Splunk Apps, Torq and Swimlane integration catalogs all ship connectors as versioned, lifecycle-managed units. But five of seven vendors package connectors alongside playbooks/content (XSOAR Content Packs bundle integrations plus playbooks plus layouts together), so connectors live inside the Authoring module rather than as their own top-level module. Tines is the lone thin-connector exception (mostly generic HTTP actions).
- Case versus incident: almost no vendor models "case" and "incident" as two separate masters. XSOAR's Incident, ServiceNow SIR's Security Incident, and Splunk's Container each serve as both case and incident in one record. The few vendors with a literal Cases object (Tines Cases, Torq HyperSOC, ThreatConnect) use it as the primary investigation container, not a tier below an incident, and Tines/Torq often defer the case to an external ITSM entirely. So the build uses a single security_incidents master and drops the separate security_cases entity proposed earlier.
- SEC 8-K disclosure and breach-notification trails are not first-class entities in any flagship product; they are assembled from the incident timeline, case notes, and run logs. The build models them as Compliance-class field sets and tasks on the incident plus an audit-log entity, not as new masters.

Recommended: a, with the researched shape: (1) SOAR-PLAYBOOK-AUTHORING owns security_playbooks/workflows, playbook_steps, playbook_versions, and integration_connectors (plus content packs, layouts, credentials); (2) SOAR-AUTOMATION-RUNTIME owns automation_runs, automation_run_steps, automation_artifacts, automation_run_logs; (3) SOAR-CASE-MGMT owns a single security_incidents master with case_tasks, case_evidence, case_timelines, case_notes, and IOC records. This is the eyeball 3-module split with two evidence-driven corrections (connectors moved into authoring, security_cases folded into security_incidents). Answering this unlocks the whole build.

a1:

---

q2: SOAR's business description still contains a forbidden em-dash character. Should I rewrite it to remove the em-dash (replacing it with a sentence break, no other change)? (yes/no)

Recommended: yes. The em-dash is forbidden project-wide. This overwrites a non-empty value, so it needs your sign-off; the rewrite is a mechanical character swap only. The new text would read: "Playbook DSL runtime that executes orchestrated steps across security tools. The engine IS the product, even if individual steps are declarative."

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
