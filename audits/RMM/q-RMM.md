# Remote Monitoring and Management (RMM): questions waiting for you

## What this domain is
Watch, patch, and run scripts on every endpoint you manage, from one console. RMM puts a lightweight agent on each device, streams back live telemetry and alerts, schedules and rolls out patches, and runs automation scripts at scale, with multi-tenant separation so a managed-service provider can keep each customer's fleet isolated. It feeds discovered hardware, software, and configuration items out to your asset and service-management systems, and raises tickets and incidents when something breaches a threshold.

---

q1: (answer this first) Monitoring alerts and monitoring policies sit inside RMM as an embedded copy of a master that ITOM owns. RMM's slice is agent-emitted endpoint telemetry; ITOM covers the broader APM, log, and event sources. Is that embedded arrangement the intended end state, or should RMM own its own endpoint-specific records?

- a) Keep them as an embedded master, with ITOM as the canonical owner (the current state).
- b) Give RMM its own endpoint-specific records (endpoint_alerts and endpoint_monitoring_policies) that it masters directly.

Recommended: a. The embedded arrangement already resolved the old hard collision and keeps ITOM as the single source of truth; splitting out endpoint-specific records is new modeling work whose blast radius reaches ITOM, AIOps, the MSP PSA, and ITSM event management, so it is better coordinated with an ITOM pass. This is the data-model-shape decision the rest of the build sits on.

a1:

---

q2: Automation scripts is a name RMM shares with the test-management domain, which means a different thing by it (Selenium and Playwright test scripts, versus RMM's PowerShell, Bash, and Python endpoint scripts). Test management has no live claim yet, but the name should be settled before it does. How should it be named?

- a) Carve out test_automation_scripts for the test-management side and keep automation_scripts for RMM.
- b) Keep automation_scripts for the test-management side and rename RMM's record to endpoint_automation_scripts.
- c) Keep one shared record for both.

Recommended: a. It keeps RMM's existing name stable while giving the test-management market its own clearly named record; coordinate the final call with the test-management pass.

a2:

---

q3: Agent telemetry carries hostnames, the logged-in username, and network details, which is personal data on a user's workstation. Should RMM agents be flagged as holding personal content (so they fall under privacy and retention rules)? (yes/no)

Recommended: yes. The telemetry is personal data, so flagging it is the safe and accurate call.

a3:

---

q4: Once a patch job is in flight or completed, its schedule arguably should not be editable any more, so the execution record stays trustworthy. Should patch jobs be frozen at that point? (yes/no)

Recommended: yes. A patch job is an execution record; locking it once it starts keeps an accurate history of what ran where.

a4:

---

q5: Should an automation script be frozen once it is published, so any change goes through a new version rather than editing the live one? (yes/no)

Recommended: yes. A published script runs on endpoints, so version-locking it keeps changes auditable.

a5:

---

q6: Automation scripts may fit the config-shape pattern (authored once, occasionally edited, with no real workflow states worth tracking beyond the review signal). Should they be exempt from a full lifecycle, or get a full draft/active/retired lifecycle?

- a) Exempt them from lifecycle states.
- b) Give them a full draft/active/retired lifecycle.

Recommended: a. Scripts behave like configuration that is edited in place rather than progressing through workflow states, so the exemption fits and avoids over-modeling. Note this interacts with q5: if you version-lock published scripts, the exemption still holds because each version is a fresh record.

a6:

---

q7: Once workflow gates exist, the related permissions need to be bundled onto roles. Proposed roles are RMM-OPERATOR (acknowledge, resolve, and suppress alerts), RMM-PATCH-MANAGER (approve and roll back patch jobs), RMM-AUTOMATION-AUTHOR (approve and deprecate scripts), and RMM-ADMIN (install and uninstall agents, deprecate policies). Confirm these names and bundling, or propose an alternative?

- a) Confirm the proposed roles and bundling.
- b) Propose an alternative role shape.

Recommended: a. The four roles map cleanly onto the distinct workflow gates (front-line ops, patching, scripting, administration) without over-splitting.

a7:

---

q8: Should any RMM module also be installed onto another domain (hosted there), or should RMM stay the only host for its modules?

- a) RMM is the only host for its own modules.
- b) Also host the monitoring module on ITOM.
- c) Also host the agent-management module on UEM.

Recommended: a. Keeping RMM the sole host avoids extra installation coupling; ITOM and UEM can still consume what they need without hosting the module.

a8:

---

q12: Hardware Asset Management forwards rmm agent to Remote Monitoring and Management to decommission productive assets, but Remote Monitoring and Management does not yet have anyone assigned to decommission productive assets, so this step has no owner. How should it be handled?
- a) Record it now as work Remote Monitoring and Management owns, and assign a named owner once Remote Monitoring and Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Remote Monitoring and Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: IT Asset Management forwards automation script to Remote Monitoring and Management to update work and asset records, but Remote Monitoring and Management does not yet have anyone assigned to update work and asset records, so this step has no owner. How should it be handled?
- a) Record it now as work Remote Monitoring and Management owns, and assign a named owner once Remote Monitoring and Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Remote Monitoring and Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

## Optional (will not hold up the build)

q9: Flagship RMM vendors model several endpoint records that RMM does not carry yet: agent groups, per-metric monitoring thresholds, patch-approval policies, maintenance windows, remote-control sessions, script runs (the execution event, distinct from the script definition), compliance baselines (CIS, NIST), agent install packages, and customer tenants. Should I research and add the ones that hold up? Script runs is the highest-priority gap, since the automation module currently masters only the script definition and has no record of what actually ran where. (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Script runs and agent groups are the strongest; the rest want a verification pass first. (customer_tenants likely belongs to the MSP PSA domain rather than RMM.)

a9:

---

q10: If the compliance and patch-approval records above get added, two extra modules start to make sense rather than overloading the existing ones: an RMM-COMPLIANCE module (baselines, patch-approval policies, drift detection) and an RMM-REPORTING module (customer-facing dashboards and scheduled reports). Should I research and add either? (yes/no)

Recommended: yes in principle, but only once the underlying records land; both are non-blocking.

a10:

---

q11: Managed-service providers often inherit compliance obligations from the customers they serve. Should I research applicability of SOC 2, HIPAA pass-through (Business Associate obligations), CMMC (US DoD contractors), and NIS2 (EU critical-infrastructure suppliers), and tag the ones that apply? (yes/no)

Recommended: yes, as a research pass; these are regulatory-applicability calls, additive and non-blocking.

a11:

---

<!-- agent map, ignore: q1=B2-S3 q2=B2-S4 q3=B2-S5.agentpii q4=B2-S5.patchlock q5=B2-S5.scriptlock q6=B2-S6 q7=B2-S7 q8=B2-S8 q9=B3-AGENT-GROUPS+B3-MONITORING-THRESHOLDS+B3-PATCH-APPROVAL-POLICIES+B3-MAINTENANCE-WINDOWS+B3-REMOTE-SESSIONS+B3-SCRIPT-RUNS+B3-COMPLIANCE-BASELINES+B3-AGENT-INSTALL-PACKAGES+B3-CUSTOMER-TENANTS+B3-MISSING-MASTER-RMM-AUTOMATION q10=B3-MOD-RMM-COMPLIANCE+B3-MOD-RMM-REPORTING q11=B3-REG-SOC2+B3-REG-HIPAA-PASSTHROUGH+B3-REG-CMMC+B3-REG-NIS2 q12=B2-B9D-OWN-355 q13=B2-B9D-OWN-1552 | domain_id=130 -->
