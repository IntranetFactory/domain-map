# Data Quality (DQ): questions waiting for you

## What this domain is
Profile, cleanse, standardize, match, and continuously monitor your data so it stays fit for its purpose. Author the rules and checks that define "good" data, profile what you actually have, triage and remediate the incidents when data drifts out of bounds, and hold data fitness to scorecards and SLAs. The domain spans both the legacy data-quality toolset (profiling, rule authoring, matching) and the modern data-observability surface (monitoring, anomaly detection, SLA enforcement).

---

q1: (answer this first) How should Data Quality be split into modules (the sub-areas of the product)?

- a) Three modules: Rules (rule authoring and profiling); Incident Management (incident triage, remediation, and SLAs); Monitoring (dimensions, scorecards, and anomaly detection). Mirrors the vendor-cohort split between legacy DQ tools and observability vendors.
- b) Two modules: Rules plus Observability (fold incident management into observability since both raise incidents).
- c) One module: a single Data Quality module. This becomes non-viable once the 5-7 capabilities load, because a domain that size needs at least two modules.

Recommended: a. It matches how the market is actually split (legacy profiling and rule tools versus modern data-observability vendors) and keeps each area small enough to own cleanly. This choice drives the build, capability-to-module mapping, lifecycle anchoring, and source-module attribution below it, so it unlocks the rest of the build.

a1:

---

q2: anomaly_detections is currently mastered by both Data Quality and AIOps (a catalog-wide single-master conflict). Which domain canonically owns it, and what shape does the fix take?

- a) Split it into two objects: data_anomalies (owned by Data Quality) and event_anomalies (owned by AIOps), since their verbs and lifecycles diverge.
- b) Keep anomaly_detections canonical in Data Quality and demote AIOps to a consumer.
- c) Keep anomaly_detections canonical in AIOps and demote Data Quality to a consumer.

Recommended: a. Data anomalies (profile breach, dimension drop) and event anomalies (signal spike, log pattern) have genuinely different lifecycles, so splitting them is cleaner than forcing one shared master. This must be resolved before the Monitoring module can claim the entity.

a2:

---

q3: Should DATA-OBSERVABILITY-MONITORING be authored as a domain-neutral cross-cutting capability now (spanning Data Quality, Data Catalog and Governance, the data and AI platform, and Observability), or as a domain-prefixed DQ-MONITORING capability?

- a) Author it now as a domain-neutral cross-cutting capability.
- b) Author it now as a domain-prefixed DQ-MONITORING capability, and revisit if DATA-OBSERVABILITY is later promoted to its own domain.
- c) Wait for the DATA-OBSERVABILITY missing-domain decision before authoring it.

Recommended: a. It genuinely spans three or more domains, which is the bar for a cross-cutting capability, so a domain-neutral home is the most accurate. The DATA-OBSERVABILITY domain candidate is only queued, not decided, so waiting on it would stall capability authoring.

a3:

---

q4: For solution coverage, should we add pure-play Data Quality flagship vendors as primary-coverage rows, or accept the current ten platform-coverage solutions as-is?

- a) Add 4-6 pure-play DQ flagships as primary coverage. This also unblocks the seven vendor-specific aliases (such as "expectation", "check", "monitor", "incident") that the platform requires to be anchored to a real vendor solution.
- b) Accept the current ten solutions as platform-coverage only, and audit the Phase A solution set separately.

Recommended: a. The current ten read like a data-and-AI-platforms set rather than DQ specialists, and there are no primary-coverage solutions today, so adding the pure-plays both fixes coverage and unblocks the vendor aliases.

a4:

---

q5: One outbound handoff from Data Quality to Data Catalog and Governance (when a profile result updates, passing the affected data assets) is currently labeled with the wrong standard-process tag ("Maintain master data"). That work is actually handled under a different process, "Monitor and control business information", which the catalog already knows about. How should the mislabel be fixed?

- a) Re-label the handoff to point at "Monitor and control business information" (the process that really handles this).
- b) Remove the label entirely and leave the handoff untagged for now.

Recommended: a. The work is real and already realized under "Monitor and control business information", so re-labeling keeps the handoff tied to the right process rather than dropping it back to an untagged guess. (This edits an existing tag, so it needs your sign-off before I change it.)

a5:

---

## Optional (will not hold up the build)

q6: Three additional entity candidates show up in the vendor surface (data_contracts, a bilateral producer-to-consumer contract adjacent to SLAs; survivorship_rules, for golden-record formation; merge_decisions, the dedup workflow). Should I research and add the ones that hold up, given that survivorship and merge may belong to MDM rather than Data Quality? (yes/no)

Recommended: yes, but additive and only after the modules exist. data_contracts is the strongest fit; survivorship_rules and merge_decisions need a vetting pass to settle the MDM-versus-DQ home.

a6:

---

<!-- agent map, ignore: q1=B2-MOD-SPLIT q2=B2-ANOMALY-OWNER q3=B2-XCUT-CAP q4=B2-COVERAGE q5=B2-B9D-MISTAG-268 q6=B3-DATA-CONTRACTS+B3-SURVIVORSHIP-RULES+B3-MERGE-DECISIONS | domain_id=90 -->
