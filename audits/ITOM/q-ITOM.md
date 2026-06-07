# IT Operations Management (ITOM): questions waiting for you

## What this domain is
Keep your IT infrastructure healthy: watch it, catch problems early, and plan ahead so it never runs out of room.

Pull in events, alerts, and capacity readings from across servers, networks, and cloud, apply the monitoring policies that decide what is normal and what fires an alert, and route the real signals to the people and systems that act on them. Forecast where capacity is heading before it bites, and automate the routine operational responses (runbooks and scheduled jobs) that keep the lights on.

---

q1: (answer this first) The runbook automation and job-scheduling capabilities are point-solution markets in their own right (Rundeck, Resolve, Stonebranch for runbooks; Control-M, AutoSys for workload automation). Today both are grouped into one ITOM Ops Automation module. How should they be shaped?

- a) Promote both into their own domains (IT Process Automation and Workload Automation), move the two capabilities out, and retire the Ops Automation module.
- b) Keep both inside ITOM as capabilities in the Ops Automation module (optionally split that module into two).
- c) Promote runbook automation into its own domain, but keep job scheduling as an ITOM module.

Recommended: a. Both are distinct point-solution markets, the rule of thumb favors splitting them out, and the current Ops Automation module has no master data of its own. This decision sets the ITOM module count and whether that module survives, so it unblocks the rest of the build.

a1:

---

q2: Both ITOM and the Remote Monitoring and Management (RMM) domain currently claim to own monitoring alerts and monitoring policies in the legacy rollup. RMM has no modules of its own. Who should be the canonical owner?

- a) ITOM is canonical; RMM keeps a read-only embedded copy of both.
- b) ITOM is canonical; RMM is demoted to a plain consumer of both.
- c) Split them: ITOM owns the general monitoring shapes, RMM gets its own distinct RMM-specific alert and policy shapes.

Recommended: a. ITOM is the broader market and already owns both cleanly at the module layer; an embedded copy keeps RMM's view working without a second master. Pick (c) only if RMM needs a materially different shape long term. The ITOM module set does not depend on this.

a2:

---

q3: Should a monitoring policy be frozen once it is activated, so any change requires a new version rather than editing the live one? (yes/no)

Recommended: yes. Policy version commits are normally immutable after activation, which keeps an accurate record of what was live. The other masters stay editable (alerts are machine-generated and never approved; capacity records hold no personal data). This overwrites a current value, so it needs your confirmation.

a3:

---

q4: An inbound handoff from the observability domain carries a "threshold breached" trigger whose payload is ITOM's own alert entity, even though the breach happens in observability. How should this be handled?

- a) Leave it as-is (observability publishes into ITOM's alert master).
- b) Add an observability-owned alert entity and re-anchor the trigger onto it.
- c) Define observability-published triggers as inbound events on ITOM masters by exception.

Recommended: b. The breach originates in observability, so anchoring the trigger on an observability-owned entity is the cleanest ownership boundary. This re-anchors a live trigger, so it needs your sign-off, and the call routes through the observability audit.

a4:

---

q5: A "suppression applied" trigger still points at ITOM's monitoring-events entity, but the suppression decision is actually owned by the AIOps domain (ITOM only consumes the result). Where should this trigger be anchored?

- a) Re-anchor it onto the AIOps alert-suppression-rules entity.
- b) Leave it on monitoring events with a note that the event is AIOps-published.
- c) Defer until the AIOps audit confirms its suppression entity.

Recommended: a. AIOps owns the suppression logic, so the trigger belongs on its entity; this also keeps the related handoff payload mapping consistent. Re-anchoring a live trigger is a change that needs your sign-off.

a5:

---

q6: ITOM event-management vendors ship author-time correlation rules, while AIOps has ML-driven correlation rules. Are these one concept or two distinct entities?

- a) Distinct: ITOM owns deterministic event-correlation rules, AIOps owns ML correlation rules.
- b) One AIOps-owned correlation-rules entity that ITOM consumes as an embedded copy.
- c) One ITOM-owned event-correlation-rules entity that AIOps consumes.

Recommended: a. Deterministic author-time rules and ML-learned rules are genuinely different objects in the vendor surface, so keeping them separate avoids forcing two unlike concepts into one shape. This routes through the AIOps audit.

a6:

---

q7: Six cross-domain handoffs were tagged to the "Manage infrastructure performance and capacity" process, which diverges from the originally proposed "Operate and monitor online systems" / "Plan operational activities" mappings. How should they be resolved?

- a) Approve all six on the as-applied capacity process.
- b) Swap a subset back to the originally proposed mappings.
- c) Split per-handoff with a custom mapping table.

Recommended: a. The capacity process is the closest fit for all six and is already applied; approve as-is unless you see a handoff that clearly belongs elsewhere. This also clears the way for the handoff approval in the next question.

a7:

---

q8: All 13 cross-domain handoffs touching ITOM carry process tags, but every one sits at "new" (zero approved). Should the process assignments be approved?

- a) Approve all 13 as-tagged.
- b) Approve a named subset; leave the rest pending the process ratification above.
- c) Defer entirely until the divergent mappings above are resolved.

Recommended: a, once you are comfortable with the process mappings above. Promotion to approved is an explicit sign-off step, so it is never applied automatically.

a8:

---

## Optional (will not hold up the build)

q9: Several candidate master entities show up across the flagship ITOM vendors but are not yet created: runbook definitions, job definitions, ML baselines, infrastructure health scores, metric collectors, alert routing rules, and first-class capacity forecasts. Should I research and add the ones that hold up against the vendor surface? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Runbook and job definitions depend on the module-split decision above (only if those capabilities stay in ITOM), and some may stay derived views rather than masters, so each wants a verification pass first.

a9:

---

q10: Today ITOM mostly publishes alerts into ITSM. Should I add the reverse direction, where an ITSM incident resolution auto-closes the related monitoring alerts? (yes/no)

Recommended: yes, pending a quick check on whether the flagship vendors model this as a publish-subscribe handoff or as an internal rule on the alert. Additive and non-blocking.

a10:

---

<!-- agent map, ignore: q1=B2-S5 q2=B2-S1 q3=B2-S2.submitlock q4=B2-S3 q5=B2-S3a q6=B2-S4 q7=B2-S6 q8=B2-S7-APQC-APPROVAL q9=B3-S1+B3-S2+B3-S3+B3-S5+B3-MISSING-ENTITIES q10=B3-S4 | domain_id=2 -->
