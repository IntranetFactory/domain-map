# AIOps (AIOPS): questions waiting for you

## What this domain is
Cut alert noise and find the real cause faster with AI across all your IT telemetry.

Pull in high-volume events, metrics, logs, and traces, then let machine-learning and statistical models do the heavy lifting: correlate and deduplicate related alerts, spot anomalies against a learned baseline, infer the probable root cause, and forecast incidents before they hit. Suppress the noise that does not matter, hand clean signals to your incident and operations teams, and keep the models that drive all of it trained and trustworthy.

---

q1: (answer this first) How should AIOps be split into modules? The build adopted a 2-module split: Event Correlation (event_correlations, anomaly_detections, alert_suppression_rules) and Predictive Intelligence (predictive_signals, incident_predictions, root_cause_analyses, ml_model_training_records).

- a) Two modules: Event Correlation + Predictive Intelligence. This mirrors how ServiceNow packages AIOps as two products (Event Management vs Predictive AIOps); BigPanda, Moogsoft, and PagerDuty all sell event correlation and noise reduction as the primary standalone surface.
- b) Three modules: also break out Service Health (service-health scores, golden-signal definitions, escalation policies). Datadog (service_health) and Dynatrace Davis (service_health) both expose this as a first-class surface, so it is a real packaging, not hypothetical, if you want a service-scoring / glass-table tier.
- c) Four modules: also split ML Model Ops (training records, drift, feedback labels) out of Predictive Intelligence.

Recommended: a, with one honest caveat. ServiceNow is the closest analog and ships exactly this 2-way split, and the rest of the field leads with event correlation as the core product, so a is how the market is actually sold. The genuine judgment call is where anomaly_detections sits: I put it in Event Correlation (where Moogsoft keeps its anomaly detectors), but Datadog, Dynatrace, and ServiceNow Health Log Analytics put anomaly detection on the predictive/ML side, so moving it into Predictive Intelligence is equally defensible. Take (b) if you want a service-health scoring tier (real Datadog/Dynatrace precedent). Avoid (c): no AIOps suite sells model-ops as its own module, that is the dedicated MLOps market (Weights and Biases, MLflow), which is the separate domain question in q3.

a1:

---

q2: The trigger event "topology.published" sits on event_correlations, but it describes service topology (a CMDB concept) and no handoff uses it. How should it be handled? (This is a destructive change, so it needs your sign-off.)

- a) Delete it (nothing depends on it).
- b) Re-attribute it to the CMDB service_maps object.
- c) Keep it on event_correlations and rewrite its description, if AIOps really publishes its own topology view.

Recommended: b. The name and description point at service topology, which CMDB owns, so re-attributing is the cleanest fix.

a2:

---

q3: Should ml_model_training_records stay owned by AIOps, or move to a future MLOps domain?

- a) Keep AIOps as owner; let MLOps embed it later when MLOps lands.
- b) Move the canonical master to MLOps and have AIOps consume or embed it instead.

Recommended: a. Every flagship AIOps suite keeps its detection/anomaly models inside the platform: BigPanda trains on feedback labels, Dynatrace Davis owns its baselines, ServiceNow and Moogsoft retrain their own anomaly models. None outsource model training to a separate tool. Dedicated MLOps products (Weights and Biases, MLflow, the queued MLOPS candidate) govern the data-science model lifecycle, which is a different surface from operational detection-model retraining. So AIOps should own these records; a future MLOps domain can embed them if you ever want unified model governance.

a3:

---

q4: Should an ML model training run be frozen once it commits, so a completed run is immutable? (yes/no)

Recommended: yes. A training run is a fixed artifact; locking it preserves an accurate record of what was trained. This overwrites a current value, so it needs your confirmation.

a4:

---

q5: Should a root cause analysis be frozen once published, so findings cannot be quietly edited? (yes/no)

Recommended: yes. Published findings are referenced by incident and problem teams and should stay stable. This overwrites a current value, so it needs your confirmation.

a5:

---

q6: Should an alert suppression rule be frozen once activated, so any change requires a new rule rather than editing the live one? (yes/no)

Recommended: yes. A live suppression rule decides which alerts get silenced, so changes should go through a fresh rule for auditability. This overwrites a current value, so it needs your confirmation.

a6:

---

q7: The AIOps agent currently notifies via channel-specific tools (send email, post chat message). Are these backing a specific named workflow, or are they generic notifications?

- a) They back a specific workflow (name it): keep the channel-specific tools.
- b) They are generic notifications: swap them for the higher-level notify-person / notify-team tools.

Recommended: b. Generic notifications should use the abstraction so the channel can change without rewiring; keep channel-specific tools only if a real workflow depends on them.

a7:

---

q8: The cross-domain handoff APQC tags are loaded as provisional (record_status='new'). Promote them to approved? (yes/no)

Recommended: yes, if you agree the process mappings are correct. Promotion to approved is a sign-off step, so it is not applied automatically.

a8:

---

q9: One inbound handoff (a failed data pipeline run feeding AIOps) could map two ways. Which process mapping is correct?

- a) Keep the existing tag: "Develop and execute IT resilience and continuity operations" (broader L3 process).
- b) Replace it with "Run and monitor batch job schedule" (more specific L4 process).

Recommended: b. A failed pipeline run maps most precisely to batch job monitoring. Replacing the tag overwrites a value, so it needs your call.

a9:

---

## Optional (will not hold up the build)

q10: Nine extra market-surface objects show up across the flagship AIOps vendors (correlation rules, enrichment pipelines, service health scores, alert storms, feedback labels, change correlations, model drift alerts, escalation policies, golden-signal definitions). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules are confirmed. Several are common across the vendor set, though they still want a verification pass first.

a10:

---

q11: Today AIOps mostly receives signals from your observability domain. Should I add the reverse, closed-loop direction, where AIOps feeds a recommendation back (for example, raise a noisy alert threshold or adjust an SLO band)? (yes/no)

Recommended: yes, pending a quick check that flagship vendors model this back-pressure signal. Additive and non-blocking.

a11:

---

q12: When AIOps identifies a high-confidence root cause and a runbook exists, should it hand off to auto-remediation (via the security-focused SOAR domain or a separate IT process-automation domain)? (yes/no)

Recommended: yes in principle, but it needs a scoping check first on whether SOAR's mandate covers general IT runbooks. Additive and non-blocking.

a12:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-TRIGGER-TOPOLOGY-PUBLISHED q3=B2-MLOPS-OWNERSHIP q4=B2-PATTERN-FLAG-FREEZES.mltraining q5=B2-PATTERN-FLAG-FREEZES.rca q6=B2-PATTERN-FLAG-FREEZES.suppression q7=B2-CHANNEL-SWAP q8=B2-H1B-PROMOTION.promote q9=B2-H1B-PROMOTION.reconcile154 q10=B3-MARKET-SURFACE q11=B3-AIOPS-TO-OBS-FEEDBACK q12=B3-AIOPS-TO-SOAR-OR-ITPA | domain_id=6 -->
