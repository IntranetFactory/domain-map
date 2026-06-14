# Network Performance Monitoring and Diagnostics (NPMD): questions waiting for you

## What this domain is

NPMD watches your network end to end: it collects flow records and path traces, baselines normal performance, and raises alerts when traffic, latency, or loss go wrong. It also tracks how SaaS and internet services perform from your users' side, then hands the signals off to ticketing, observability, and AIOps so problems get fixed before users feel them.

---

q1: (answer this first) How should NPMD be split into modules (the sub-areas of the product)?

- a) Four modules: Flow Analysis (network flow records and interfaces); Path Tracing (network paths and topology snapshots); Metrics and Alerts (performance metrics, baselines, alerts); SaaS and Internet Performance (SaaS application performance).
- b) Two modules: NPMD-CORE (flow, paths, metrics, alerts, interfaces, topology, baselines all together) plus a standalone SaaS and Internet Performance module.

Recommended: a. The four-module split better reflects the vendor surface (flow vs path vs metric vs SaaS-internet is a real product taxonomy across the leader quadrant), at the cost of more module overhead. This one decision drives which capabilities realize on which module, the vendor and solution research, the handoff backfill, the roles, the toolset, and re-attaching the alert lifecycle, so it unlocks the rest of the build.

a1:

---

q2: Where should SaaS application performance live?

- a) Keep it in NPMD (the network-path view: latency and loss to the SaaS endpoint); DEM authors a parallel digital-experience-sessions entity for the endpoint view.
- b) Move it to DEM (the endpoint-experience view); NPMD becomes a contributor.
- c) Split it into two entities: network-path-to-SaaS-performance in NPMD and SaaS-user-experience-sessions in DEM.

Recommended: a. The NPMD view is genuinely network-path-to-SaaS, distinct from DEM's endpoint perspective, so keeping it here and letting DEM author its own parallel entity avoids a premature move. This choice sets the target for the SaaS-degradation cross-domain edge and the vendor research.

a2:

---

q3: How should NPMD model network devices (router, switch, firewall, SD-WAN edge, packet broker)?

- a) NPMD masters network devices outright.
- b) NPMD treats them as an embedded master, with CMDB potentially mastering them later.
- c) NPMD consumes CMDB configuration items via a filter instead of holding its own device entity.

Recommended: b. ThousandEyes, NETSCOUT nGeniusONE, and Kentik each carry their own network-device entity (router, switch, firewall, SD-WAN edge, packet broker) holding monitoring-scoped fields like SNMP credentials and polling profiles, distinct from a CMDB configuration item, yet none of them claims to be the enterprise's canonical device source of record. That packaging is exactly an embedded master: NPMD owns the device fields it needs now while leaving canonical discovery to CMDB later, which is why it edges out mastering outright (a) and consuming CMDB CIs raw via a filter (c), and it sets the target for future synthetic-test and path-tracing references.

a3:

---

q4: For the two collision-risk masters, network_interfaces (clashes on the bare word "interfaces") and saas_application_performance (overlaps the APM domain's headline "application_performance"), should I confirm both keep their network_ / saas_ prefix and stamp them as reviewed?

- a) Confirm both keep the prefix; I stamp is_canonical_bare_word=false and write a one-line rationale for each.
- b) Rename one or both (tell me the new names).

Recommended: a. Both already carry a domain prefix, so the cleanest path is to confirm the prefix and record the rationale rather than rename. The rationale text is a judgment call, so it is surfaced before any write.

a4:

---

q5: Should NPMD record an applicable regulation, or stay at zero?

- a) Leave it at zero (NPM is regulation-adjacent, not regulation-driven).
- b) Add PCI-DSS as scope-of-monitoring (applies when NPMD covers payment-card traffic).
- c) Add FedRAMP (for federal-cloud deployments).

Recommended: a. Network monitoring tools are not directly regulated; PCI-DSS or FedRAMP only apply when the monitored traffic itself is in scope, so zero is the honest default unless you have those workloads. Low stakes, independent of the build.

a5:

---

q6: NPMD's owner (IT Infrastructure) is already recorded. Should I add more functional links?

- a) Add both: IT Operations / NOC as a contributor and Security as a consumer (NDR and threat-hunting on NetFlow).
- b) Add the NOC contributor only.
- c) Add neither (keep IT Infrastructure as sole owner).

Recommended: a. Both functions really do touch NPMD (the NOC operates it, Security consumes NetFlow for detection), so recording both links reflects reality. I will resolve the exact NOC and Security function ids before writing.

a6:

---

## Optional (will not hold up the build)

q7: Seven extra entity candidates show up across the flagship NPM vendors (synthetic tests, synthetic test runs, BGP route observations, packet captures, network probes, traffic classifications, network KPI definitions). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Synthetic tests, synthetic test runs, and BGP route observations are vendor-universal, though all seven still want a verification pass first.

a7:

---

<!-- agent map, ignore: q1=B2-MOD-SPLIT q2=B2-SAAS-VS-DEM q3=B2-NETWORK-DEVICES q4=B2-NAMING-ARBIT q5=B2-REGULATIONS q6=B2-FUNCTIONAL-RACI q7=B3-SYNTHETIC-TESTS+B3-SYNTHETIC-TEST-RUNS+B3-BGP-ROUTE-OBSERVATIONS+B3-PACKET-CAPTURES+B3-NETWORK-PROBES+B3-TRAFFIC-CLASSIFICATIONS+B3-NETWORK-KPI-DEFINITIONS | domain_id=82 -->
