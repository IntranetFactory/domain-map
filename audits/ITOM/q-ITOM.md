# IT Operations Management (ITOM): questions waiting for you

## What this domain is
Keep your IT infrastructure healthy: watch it, catch problems early, and plan ahead so it never runs out of room.

Pull in events, alerts, and capacity readings from across servers, networks, and cloud, apply the monitoring policies that decide what is normal and what fires an alert, and route the real signals to the people and systems that act on them. Forecast where capacity is heading before it bites, and automate the routine operational responses (runbooks and scheduled jobs) that keep the lights on.

---

q1: (answer this first) Runbook automation and job scheduling (workload automation) are currently bundled into one ITOM Ops Automation module that has no master data of its own. The two are different markets. How should they be shaped?

- a) Promote job scheduling / workload automation into its own domain, and keep runbook automation inside ITOM, rescoping the Ops Automation module to runbook/process automation (which finally gives it real master data: runbook definitions, runbook executions, automation policies).
- b) Promote both into their own domains and retire the ITOM Ops Automation module.
- c) Keep both inside ITOM as today.
- d) Promote runbook automation out and keep job scheduling inside ITOM.

Recommended: a. Workload automation is a distinct market with its own buyers: Gartner gives it a dedicated Magic Quadrant (Service Orchestration and Automation Platforms), whose leaders, BMC Control-M, Stonebranch UAC, Redwood RunMyJobs, Broadcom AutoSys, and Tidal, are standalone products with their own scheduler engine and license, none of them a feature of an ITOM monitoring suite. They master job definitions as first-class objects (Control-M Job and Folder objects; AutoSys defines jobs in JIL). Runbook / IT-process automation is the opposite case: ServiceNow and BMC Helix both ship runbook and automation policies natively, as remediation attached to events, so it genuinely belongs inside ITOM and gives the Ops Automation module the master data it is missing today. So job scheduling moves out to its own domain, runbook stays. This sets the ITOM module count, so answer it first.

a1:

---

q2: Both ITOM and the Remote Monitoring and Management (RMM) domain currently claim to own monitoring alerts and monitoring policies in the legacy rollup. RMM has no modules of its own. Who should be the canonical owner?

- a) ITOM is canonical; RMM keeps a read-only embedded copy of both.
- b) ITOM is canonical; RMM is demoted to a plain consumer of both.
- c) Split them: ITOM owns the general monitoring shapes, RMM gets its own distinct RMM-specific alert and policy shapes.

Recommended: a. RMM products model these as device-agent-scoped objects: in NinjaOne, ConnectWise RMM, Datto RMM, and Kaseya VSA a monitoring policy is an agent configuration bundle (CPU, RAM, disk, and SMART thresholds plus patch/AV/backup settings) pushed to an endpoint, and an alert is a per-device threshold breach (ConnectWise ships 1100+ out-of-box conditions). Enterprise ITOM (ServiceNow event-to-alert, BMC Helix) instead correlates multi-source events to service and CI impact through the CMDB. The nouns are the same and the underlying record is the same; only the scope and field semantics differ. So ITOM stays canonical and RMM keeps a read-only embedded copy. Pick (c) only if a later RMM review shows its device-agent policy needs structurally different child records (agent bindings, patch settings) that would pollute the shared master.

a2:

---

q3: Should a monitoring policy be frozen once it is activated, so any change requires a new version rather than editing the live one? (yes/no)

Recommended: yes. Policy version commits are normally immutable after activation, which keeps an accurate record of what was live. The other masters stay editable (alerts are machine-generated and never approved; capacity records hold no personal data). This overwrites a current value, so it needs your confirmation.

a3:

---

q4: An inbound handoff from the observability domain carries a "threshold breached" trigger whose payload is ITOM's own alert entity, even though the breach originates in observability. How should this be handled?

- a) Leave it as-is (observability publishes the breach into ITOM's alert master).
- b) Add an observability-owned alert entity and re-anchor the trigger onto it.
- c) Define observability-published triggers as inbound events on ITOM masters by exception.

Recommended: a. Observability platforms do master their own alert objects, Datadog Monitors, Dynatrace Problems, Grafana alert rules, Prometheus Alertmanager rules, but those are the alert-rule definitions, and they belong in the observability domain. What actually crosses the handoff into ITOM is the breach instance, and that is exactly ITOM's monitoring alert. So no new entity is needed on the ITOM side. The one real follow-up, making sure the observability domain masters its own monitor/alert-rule definitions, is a question for the observability audit, not this one.

a4:

---

q5: A "suppression applied" trigger still points at ITOM's monitoring-events entity, but the suppression decision is actually owned by the AIOps domain (ITOM only consumes the result). Where should this trigger be anchored?

- a) Re-anchor it onto the AIOps alert-suppression-rules entity.
- b) Leave it on monitoring events with a note that the event is AIOps-published.
- c) Defer until the AIOps audit confirms its suppression entity.

Recommended: a. Suppression rules are mastered by AIOps platforms as their own objects: BigPanda ships maintenance plans (conditions that suppress and silence alerts during scheduled maintenance), Moogsoft ships maintenance-window suppression, and ServiceNow Predictive AIOps and Dynatrace Davis both carry maintenance-window suppression. The catalog already holds this entity (AIOps alert suppression rules). A "suppression applied" event is the application of that AIOps-owned rule, so it belongs on the AIOps entity, not on ITOM's monitoring events. Re-anchoring a live trigger needs your sign-off, and the change routes through the AIOps audit.

a5:

---

q6: ITOM event-management vendors ship author-time correlation rules, while AIOps has ML-driven correlation. Are these one concept or two distinct entities?

- a) Distinct: ITOM owns deterministic event-correlation rules, AIOps owns ML correlation.
- b) One AIOps-owned correlation-rules entity that ITOM consumes as an embedded copy.
- c) One ITOM-owned event-correlation-rules entity that AIOps consumes.

Recommended: a. ServiceNow ships both as separate objects: Event Management has deterministic, author-time correlation rules (an admin writes rule-based alert grouping), while Predictive AIOps separately ships ML-learned grouping that adapts to the environment, the same vendor shipping two objects is the proof they are two things and not two names. BMC Helix event policies (deterministic) and the Moogsoft/BigPanda ML correlation engines confirm the same split. So ITOM owns the deterministic event-correlation rules and AIOps owns the ML correlation. This routes through the AIOps audit.

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

q11: Discovery and Service Mapping forwards monitoring policy to IT Operations Management to operate and monitor online systems, but IT Operations Management does not yet have anyone assigned to operate and monitor online systems, so this step has no owner. How should it be handled?
- a) Record it now as work IT Operations Management owns, and assign a named owner once IT Operations Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment IT Operations Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

## Optional (will not hold up the build)

q9: Several candidate master entities show up across the flagship ITOM vendors but are not yet created: runbook definitions and runbook executions (if runbook stays in ITOM per q1, these become the Ops Automation module's real masters, mastered by ServiceNow and BMC Helix), maintenance windows (every flagship vendor ships them), deterministic event-correlation rules (per q6), ML baselines, infrastructure health scores, metric collectors, alert routing rules, and first-class capacity forecasts. Should I research and add the ones that hold up against the vendor surface? (yes/no)

Recommended: yes, but additive and after the decisions above land. Runbook/job definitions follow from q1 (job definitions go to the new workload-automation domain, not ITOM), maintenance windows and event-correlation rules interact with the AIOps boundary in q5/q6, and some (health scores) may stay derived views rather than masters, so each wants a verification pass first.

a9:

---

q10: Today ITOM mostly publishes alerts into ITSM. Should I add the reverse direction, where an ITSM incident resolution auto-closes the related monitoring alerts? (yes/no)

Recommended: yes, pending a quick check on whether the flagship vendors (ServiceNow ITSM, BMC Helix) model this as a publish-subscribe handoff or as an internal rule on the alert. Additive and non-blocking.

a10:

---

<!-- agent map, ignore: q1=B2-S5 q2=B2-S1 q3=B2-S2.submitlock q4=B2-S3 q5=B2-S3a q6=B2-S4 q7=B2-S6 q8=B2-S7-APQC-APPROVAL q9=B3-S1+B3-S2+B3-S3+B3-S5+B3-MISSING-ENTITIES q10=B3-S4 q11=B2-B9D-OWN-1301 | domain_id=2 -->
