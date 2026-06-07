# AIOps (AIOPS): questions waiting for you

## What this domain is
Cut alert noise and find the real cause faster with AI across all your IT telemetry.

Pull in high-volume events, metrics, logs, and traces, then let machine-learning and statistical models do the heavy lifting: correlate and deduplicate related alerts, spot anomalies against a learned baseline, infer the probable root cause, and forecast incidents before they hit. Suppress the noise that does not matter, hand clean signals to your incident and operations teams, and keep the models that drive all of it trained and trustworthy.

---

q1: (answer this first) How should AIOps be split into modules (the sub-areas of the product)?

- a) Two modules: Event Correlation (correlating, deduplicating, and suppressing inbound events) and Predictive Intelligence (anomaly detection, predictive signals, incident predictions, root-cause analysis, and the ML training behind them).
- b) Three modules: same as (a) plus a Service Health module (service health scores, golden-signal definitions, escalation policies), added once the service-health objects are confirmed.
- c) Four modules: same as (b) but split the ML-model operations (training records, drift alerts, feedback labels) out of Predictive Intelligence into its own ML Model Ops module.

Recommended: a. The two-module split is the minimal shape that unblocks the build today; (b) and (c) only pay off once the extra service-health and ML objects actually exist. This choice drives every module, capability count, lifecycle owner, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: Trigger "topology.published" is currently attached to event correlations, but it looks like it belongs to service topology (a CMDB concept), and no handoff uses it. How should it be handled?

- a) Delete it (no handoff depends on it).
- b) Move it to the CMDB service-maps object (re-attribute ownership to CMDB).
- c) Keep it on event correlations and rewrite its description, if AIOps really does publish its own topology view.

Recommended: b. The name and description point at service topology, which CMDB owns, so re-attributing it is the cleanest fix. This is a destructive change (delete or re-attribution), so it needs your sign-off.

a2:

---

q3: For ML training records (and related ML objects), should AIOps stay the canonical owner, or should that master move to a future MLOps domain? 

- a) Keep AIOps as the owner, and let MLOps embed it later when MLOps lands.
- b) Move the canonical master to MLOps and have AIOps consume or embed it instead.

Recommended: a. Keeping it in AIOps avoids a premature move to a domain that does not exist yet; MLOps can embed it when it lands. This choice also affects whether the four-module split in q1 makes sense.

a3:

---

q4: Should ML training records be frozen once a training run commits, so completed runs are immutable? (yes/no)

Recommended: yes. A training run is a fixed artifact; locking it preserves an accurate record of what was trained. This overwrites a current value, so it needs your confirmation.

a4:

---

q5: Should a root-cause analysis be frozen once it is published, so published findings cannot be quietly edited? (yes/no)

Recommended: yes. Published findings are referenced by incident and problem teams and should stay stable. This overwrites a current value, so it needs your confirmation.

a5:

---

q6: Should an alert-suppression rule be frozen once activated, so any change requires a new rule rather than editing the live one? (yes/no)

Recommended: yes. A live suppression rule decides which alerts get silenced, so changes should go through a fresh rule for auditability. This overwrites a current value, so it needs your confirmation.

a6:

---

q7: Are "send email" and "post chat message" backing a specific named workflow, or are they generic notifications? 

- a) They back a specific workflow (name it), so keep the channel-specific tools.
- b) They are generic notifications, so swap them for the higher-level notify-person / notify-team tools.

Recommended: b. Generic notifications should use the abstraction tools so the channel can change without rewiring; keep the channel-specific tools only if a real workflow depends on them.

a7:

---

q8: Three cross-domain handoff tags (on the event-burst, root-cause, and published-root-cause handoffs) are currently marked provisional. Should they be promoted to approved? (yes/no)

Recommended: yes, if you agree the process mappings are correct. Promotion to approved is a sign-off step, so it is not applied automatically.

a8:

---

q9: One inbound handoff (a failed data pipeline run feeding AIOps) is tagged two different ways. Which process mapping is correct?

- a) Keep the existing tag: "Develop and execute IT resilience and continuity operations" (a broader L3 process).
- b) Replace it with "Run and monitor batch job schedule" (a more specific L4 process).

Recommended: b. A failed pipeline run maps most precisely to batch job monitoring. Replacing the existing tag overwrites a value, so it needs your call.

a9:

---

## Optional (will not hold up the build)

q10: Nine extra market-surface objects show up across the flagship AIOps vendors (correlation rules, enrichment pipelines, service health scores, alert storms, feedback labels, change correlations, model drift alerts, escalation policies, golden-signal definitions). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set, though they still want a verification pass first.

a10:

---

q11: Today AIOps mostly receives signals from your observability domain. Should I add the reverse, closed-loop direction, where AIOps feeds a recommendation back (for example, raise a noisy alert threshold or adjust an SLO band)? (yes/no)

Recommended: yes, pending a quick check that flagship vendors model this back-pressure signal. Additive and non-blocking.

a11:

---

q12: When AIOps identifies a high-confidence root cause and a runbook exists, should it hand off to auto-remediation (via the security-focused SOAR domain or a separate IT process-automation domain)? (yes/no)

Recommended: yes in principle, but it needs a scoping check first on whether SOAR's mandate covers general IT runbooks or a separate automation domain is warranted. Additive and non-blocking.

a12:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-TRIGGER-143 q3=B2-MLOPS q4=B2-PATTERN-FLAGS.mltraining q5=B2-PATTERN-FLAGS.rca q6=B2-PATTERN-FLAGS.suppression q7=B2-CHANNEL-SWAP q8=B2-H1B-PROMOTION-OR-RECONCILE.promote q9=B2-H1B-PROMOTION-OR-RECONCILE.reconcile154 q10=B3-MARKET-SURFACE q11=B3-AIOPS-TO-OBS-FEEDBACK q12=B3-AIOPS-TO-SOAR-OR-ITPA | domain_id=6 -->
