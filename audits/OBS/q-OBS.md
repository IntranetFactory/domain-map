# Observability (OBS): questions waiting for you

## What this domain is
See what every service in production is doing, and know the moment it stops behaving.

Bring metrics, logs, and traces together so you can answer what is happening across your distributed systems without jumping between tools. Watch live dashboards, drill from a slow request into the exact trace, and search raw logs to find the root cause.

Set service level objectives, track error budgets as they burn, and group recurring errors so the right engineer is paged before customers notice. When something breaks, the signals that fired the alert are already in front of you, with a clean handoff to your incident and ticketing workflows.

---

q1: (answer this first) Observability has not been built out into modules yet, and how we slice it decides almost everything below. How should we split it, given we expect 5 to 7 capabilities and the leading vendors sell three separate product pillars (application monitoring, log analytics, and reliability)?

- a) Three modules: application performance monitoring (metrics, traces, dashboards), log analytics (log search and retention), and reliability (service level objectives, error tracking, on-call hooks). Mirrors how the flagship vendors package the market.
- b) Two modules: a telemetry pipeline (collecting and indexing metrics, logs, and traces) plus reliability insights (objectives, error tracking, dashboards).
- c) One module bundling everything. Simplest, but likely too broad to be a valid split once we count three or more capabilities.

Recommended: a. It mirrors the flagship vendors and keeps the three distinct markets cleanly separated, which is the most defensible long-term shape. This is the gate: it decides the module set, capabilities, lifecycle states, the cross-domain handoff wiring, and the rest of the build.

a1:

---

q2: Three event signals that OBS publishes are currently attributed to records owned by other domains, which is a data defect. How should we fix them? Note this is a cleanup that deletes or re-points existing rows, so it needs your sign-off.

- a) Delete the two mis-attributed handoffs (a threshold-breach handoff to IT operations and an anomaly handoff to AIOps, both of which name records those other domains actually own), and re-point the SLO-breach event to the service level objective it really belongs to while keeping its handoff to ticketing. Recommended.
- b) Treat the derived alerts and anomalies as genuinely OBS-owned, and demote the canonical copies in IT operations and AIOps to secondary. Less likely, since AIOps canonically owns anomaly detection.
- c) Leave the defect in place. Not recommended.

Recommended: a. It corrects the attribution with the least disruption: two handoffs that name other domains' records go away, and the one event that is genuinely ours is re-pointed to the right SLO record.

a2:

---

q3: Should a service level objective be locked once it is published, so it cannot be edited in place afterward? Note this overwrites the current setting. (yes/no)

Recommended: yes. A published objective is a commitment, so freezing it once live is the safer default.

a3:

---

q4: Should a service level objective require a single named approver before it goes live? Note this overwrites the current setting. (yes/no)

Recommended: yes. SLOs are commitments others rely on, and an approver is the common control on them.

a4:

---

q5: Should resolving or closing an error group require a single named approver? Note this overwrites the current setting. (yes/no)

Recommended: no. Error triage is usually a fast engineering judgment call and a mandatory approver tends to slow it down without much benefit; flip to yes only if you want a formal sign-off on closures.

a5:

---

q6: Should log records be treated as containing personal data, so retention and privacy controls apply to them? Logs routinely carry user identifiers, addresses, and other PII. Note this overwrites the current setting. (yes/no)

Recommended: yes. Logs really do carry user PII in practice, so this is the safer and more compliant default.

a6:

---

q7: The two pure-telemetry record types (metric series and distributed traces) are write-once machine data with no review or personal-data concerns. Should they stay flag-free, with no lock, approver, or personal-data marking? (yes/no)

Recommended: yes. They are automated, write-once telemetry, so none of the workflow flags apply.

a7:

---

q8: Two outgoing links from OBS to the software delivery domain (one fired when a new error signature appears, one when a regression is detected) are still untagged with a standard process category. Should we tag them, and how? Plain version: a new or regressed error should map to a software change or release on the delivery side.

- a) Tag both to the standard process "Implement software change/release" (a new signature or regression triggers a hotfix change-release on the delivery side). Recommended.
- b) Defer both until we can confirm a cleaner process match.

Recommended: a. The mapping is reasonable and unblocks the handoff tagging; pick (b) only if you want a tighter match confirmed first.

a8:

---

## Optional (will not hold up the build)

q9: Should we research and add the missing observability building blocks that the catalog currently skips: dashboards, monitors (the configured rule, as distinct from a fired alert), synthetic tests, notification policies, a service inventory, runbooks, incidents, postmortems, and correlation groups? (yes/no)

Recommended: yes, but it is purely additive and can wait until after the build lands.

a9:

---

q10: Should we treat log management, on-call / incident response, and real-user monitoring as candidates to carve out into their own separate domains rather than bundling them inside Observability? This is really an input to the q1 split decision, so an answer here should line up with what you pick for q1. (yes/no)

Recommended: yes to keep it on the table, but only decide it together with q1, since any actual carve-out changes the module shape there.

a10:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3.slo_submitlock q4=B2-S3.slo_approver q5=B2-S3.eg_approver q6=B2-S3.log_pii q7=B2-S3.telemetry_flagfree q8=B2-APQC-616-617 q9=B3-S1 q10=B3-S2 | domain_id=7 -->
