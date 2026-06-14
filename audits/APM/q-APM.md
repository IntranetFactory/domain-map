# Application Portfolio Management (APM): questions waiting for you

## What this domain is
Keep one trusted inventory of every business application and the technology it runs on, then decide what to keep, invest in, or retire. Register applications, interfaces, technology platforms, and capability maps in a portfolio registry, score each one on cost, business value, and technical fit, and use those scores to drive rationalization (sunset, consolidate, or modernize). It feeds cost, risk, and value signals out to your finance, governance, and planning domains.

---

q1: (answer this first) How should the Rationalization module handle the application and platform records it scores, which the Portfolio Registry module already owns?

- a) Delete the duplicate "consumer" copies in Rationalization. Rationalization always installs alongside Portfolio Registry, so the registry's records are the single source of truth.
- b) Promote the Rationalization copies to embedded masters. Rationalization can be deployed standalone with its own shells of those records, which step aside when the registry is also installed.

Recommended: a. Rationalization exists to score what the registry inventories, so standalone Rationalization with nothing to score is not a real deployment. This choice decides how the two modules connect and unblocks the cross-module handoffs that depend on it. Both options change existing records, so neither runs without your sign-off.

a1:

---

q2: Some descriptive notes were written onto the tool rows and onto the cost and value records. Project rules say these note fields must stay empty unless you personally approved the wording. Did you approve that wording when it was first loaded? (yes/no)

Recommended: no. If they were auto-written, the rule requires clearing them and logging the incident; if you confirm you approved them, they stay. Clearing them is a destructive edit, so it waits on your answer.

a2:

---

q3: Should capability maps be frozen once published, so anything that depends on a map has a stable version to point at? (yes/no)

Recommended: yes. A published capability map is a reference surface for the rest of the portfolio and should not shift underneath its consumers. This flips a current setting, so it needs your confirmation.

a3:

---

q4: Should an application value score be frozen once recorded, so each quarterly snapshot stays immutable? (yes/no)

Recommended: yes. A score snapshot is a point-in-time record used to compare quarters, so locking it keeps the history honest. This flips a current setting, so it needs your confirmation.

a4:

---

q5: Should application records be treated as carrying personal data, since they often hold technical-owner contact details? (yes/no)

Recommended: yes. Owner contact details are personal data and pull the record under retention and privacy handling. This flips a current setting, so it needs your confirmation.

a5:

---

q6: A sharper "application sunsetting" event now exists. Should the two handoffs that currently fire on the generic "application lifecycle state changed" event be re-pointed to it? (yes/no)

Recommended: yes. The focused event makes the downstream handoffs to your CMDB and software-asset domains precise about what actually happened. Re-pointing overwrites an existing link, so it needs your sign-off.

a6:

---

q7: Four handoffs are tagged to a security-controls process that is a poor fit for application onboarding and lifecycle events. Should I replace those tags with focused, better-matched process tags? (yes/no)

Recommended: yes. The current tags came from a loose keyword match and misrepresent what those handoffs do; the replacement is reviewed together with the removal as one swap. Deleting the old tags is destructive, so it waits on your sign-off.

a7:

---

q9: Business Process Architecture forwards business capability map to Application Portfolio Management to develop and Manage Business Capabilities, but Application Portfolio Management does not yet have anyone assigned to develop and Manage Business Capabilities, so this step has no owner. How should it be handled?

- a) Record it now as work Application Portfolio Management owns, and assign a named owner once Application Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Application Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a9:

---

q10: Cloud Financial Operations forwards application total cost of ownership to Application Portfolio Management to monitor and analyze IT financial performance, but Application Portfolio Management does not yet have anyone assigned to monitor and analyze IT financial performance, so this step has no owner. How should it be handled?

- a) Record it now as work Application Portfolio Management owns, and assign a named owner once Application Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Application Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

q11: Strategic Portfolio Management forwards application value score to Application Portfolio Management to quantify value of IT service and project portfolio investments, but Application Portfolio Management does not yet have anyone assigned to quantify value of IT service and project portfolio investments, so this step has no owner. How should it be handled?

- a) Record it now as work Application Portfolio Management owns, and assign a named owner once Application Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Application Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

q12: Governance, Risk and Compliance forwards technology platform to Application Portfolio Management to identify and evaluate IT risk, but Application Portfolio Management does not yet have anyone assigned to identify and evaluate IT risk, so this step has no owner. How should it be handled?

- a) Record it now as work Application Portfolio Management owns, and assign a named owner once Application Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Application Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: Governance, Risk and Compliance forwards technology fit assessment to Application Portfolio Management to conduct IT risk and threat assessments, but Application Portfolio Management does not yet have anyone assigned to conduct IT risk and threat assessments, so this step has no owner. How should it be handled?

- a) Record it now as work Application Portfolio Management owns, and assign a named owner once Application Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Application Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Software Asset Management forwards enterprise application to Application Portfolio Management to review and monitor application security controls, but Application Portfolio Management does not yet have anyone assigned to review and monitor application security controls, so this step has no owner. How should it be handled?

- a) Record it now as work Application Portfolio Management owns, and assign a named owner once Application Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Application Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: IT Asset Management forwards technology platform to Application Portfolio Management to maintain IT asset records, but Application Portfolio Management does not yet have anyone assigned to maintain IT asset records, so this step has no owner. How should it be handled?

- a) Record it now as work Application Portfolio Management owns, and assign a named owner once Application Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Application Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

## Optional (will not hold up the build)

q8: Flagship portfolio tools (LeanIX, ServiceNow APM, MEGA HOPEX, Ardoq, Apptio) model a deeper technology and risk layer than we carry today: the single technology platform record is split into products, services, and platforms, and there is a dedicated risk and compliance surface (vulnerabilities, application risks, lifecycles, standards, controls, obligations) that would fit a new third module. Should I research and add the parts that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. The market-audit pass against LeanIX, ServiceNow APM, MEGA HOPEX, Ardoq, and Apptio found the three-way technology split (products, services, platforms) and a dedicated tech-risk surface consistent across the set: ServiceNow models CVE-style records as `sn_vul_vulnerability` and Ardoq carries a Vulnerability entity, which is what an APM-TECH-RISK module would own (vulnerabilities, application risks, lifecycles, standards, controls, obligations). It still wants a verification pass first.

a8:

---

<!-- agent map, ignore: q1=B2-M7-OPTION q2=B2-NOTES-POLLUTION q3=B2-PATTERN-FLAGS.capmap_submitlock q4=B2-PATTERN-FLAGS.valuescore_submitlock q5=B2-PATTERN-FLAGS.app_personalcontent q6=B2-B9-RETARGET q7=B2-H1-DELETE-STALE q9=B2-B9D-OWN-13 q10=B2-B9D-OWN-1132 q11=B2-B9D-OWN-1139 q12=B2-B9D-OWN-1156 q13=B2-B9D-OWN-1170 q14=B2-B9D-OWN-1180 q15=B2-B9D-OWN-1312 q8=B3-APM-MARKET-SURFACE | domain_id=10 -->
