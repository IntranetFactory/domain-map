# Discovery and Service Mapping (DISCOVERY): questions waiting for you

## What this domain is

See every device, cloud resource, and service before you can manage it.

Discovery scans your networks, cloud accounts, and directories to find the IT you actually run, then fingerprints each asset and maps how components connect into the business services they support. It turns blind spots into a normalized, reconciled inventory that feeds your CMDB, asset management, and operations tools, so teams stop guessing what exists and start acting on a trusted source of truth.

> Grounding: these recommendations are backed by a fresh vendor-surface study (6 flagship vendors, 2025-2026 product docs) saved at `.tmp_deploy/DISCOVERY-phase0-2026-06-08.md`. The key boundary signal: the scanning vendors (ServiceNow Discovery, Device42, Lansweeper, BMC Helix Discovery, runZero) all master the raw collection plane (scans, discovered devices, sources, credentials), while the CMDB masters the reconciled configuration item downstream. The CAASM aggregator Axonius does NOT scan at all (it pulls from 1,200+ adapters), which confirms DISCOVERY's master set stops at the raw scan/device/source layer.

---

q1: (answer this first) How should Discovery be split into modules (the sub-areas of the product)?

- a) Single module: one DISCOVERY-ENGINE covering scans, sources, and discovered candidates (only viable if the capability count stays very small).
- b) Two modules: Network Scan (network probes) and Cloud Inventory (cloud APIs).
- c) Three modules: Network Scan, Cloud Inventory, and Service Mapping (service-dependency mapping as its own area).
- d) Four modules: the three above plus Reconciliation (rules that normalize and match discovered items into config records).

Recommended: c. The flagship products package the surface into exactly these sub-areas. Network scanning is the core "Discovery" product in every vendor (ServiceNow Discovery probes/sensors/patterns, BMC Helix Discovery network and SNMP scans, runZero active/passive scan tasks, Lansweeper active/passive/credential-free). Cloud-API discovery is a distinct marketed surface with a different collection mechanism (Device42 cloud autodiscovery across AWS/Azure/GCP/OCI, ServiceNow Cloud Discovery, Lansweeper Cloud Discovery covering 150+ cloud asset types) because it scans subscriptions and projects via API keys rather than probing subnets with credentials. Service mapping is sold as its own premium SKU by the leader (ServiceNow Service Mapping on the Discovery line), Device42 ships it as Application Dependency Mapping, and Lansweeper added it via the 2025 RedJack acquisition, so pulling it into a dedicated module both matches vendor packaging and triangulates cleanly against the existing service-maps owner in the CMDB area (see q4). A fourth Reconciliation module (option d) is defensible (ServiceNow IRE rules, Device42 reconciliation, BMC normalization), but several vendors fold reconciliation into the core engine and the CMDB side owns much of the normalization, so it is better kept as a config entity inside an existing module than as its own module. This choice drives every module, capability, lifecycle, role, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: Discovery is currently the unbuilt domain, so nothing exists yet to model. Once you pick the shape in q1, should I go ahead and author the full build (capabilities, modules, masters, lifecycle states, roles, and the single domain-grain skill)? (yes/no)

Recommended: yes. This is the additive build that the shape decision unblocks; it is what makes the domain deployable. Nothing destructive happens here.

a2:

---

q3: Which domain should canonically own monitoring policies once the new ownership layer replaces the legacy one?

- a) ITOM (operations-platform centric).
- b) RMM (remote-management centric).

Recommended: this is really an ITOM and RMM decision, and you can safely defer it to their next audits. In the market, monitoring policies are owned by the operations/monitoring platform (the ITOM-style operations suite) or by the remote-management tool that enforces them on endpoints, not by the discovery scanner. None of the flagship discovery vendors (ServiceNow Discovery, Device42, Lansweeper, BMC Helix Discovery, runZero) master monitoring policies as a discovery object; discovery at most flags that a newly found device needs monitoring coverage. Discovery only contributes to monitoring policies, it does not own them, so it does not block the Discovery build. Pick one only if you want to settle it now.

a3:

---

q4: Should service maps stay owned by the CMDB service-mapping area, with Discovery just publishing scan-completed events into it (option b), or should Discovery take over ownership in a dedicated Service Mapping module (option a)?

- a) Move ownership to a Discovery Service Mapping module (only makes sense if you chose three or four modules in q1); CMDB then steps down to a consumer.
- b) Keep CMDB as the canonical owner; Discovery keeps publishing scan-completed events as it does today. No further action.

Recommended: b. The vendor evidence is genuinely split on where the mapping engine lives but consistent on where the result lives. ServiceNow sells Service Mapping on the Discovery line, but markets the output (the application service / service map) as a CMDB asset; BMC frames dependency mapping as part of discovery (the "DD" in the original ADDM name) yet the dependency model lives in the CMDB graph; Device42 produces ADM topology that resolves into its own CMDB. So the mapping work can sit in a Discovery Service Mapping module, but the canonical service-map record belongs to the CMDB. Discovery already publishes the upstream `discovery_scan.completed` events, so keeping CMDB as the owner avoids reshuffling a master that is working today; a Discovery Service Mapping module would carry consumer or derived rows, not a master. Confirm before I author the internal relationships around discovered devices and service maps.

a4:

---

q5: One handoff publishes an unsanctioned-app signal from Discovery to your SaaS Management area, but the event it fires on is single sign-on login data, which is the SaaS Management area's own native channel rather than a discovery scan. How should it be handled?

- a) Keep it outbound from Discovery on the current single-sign-on event (no change).
- b) Re-source the handoff so the SaaS Management area publishes it instead; Discovery drops it from its outbound set.
- c) Keep the handoff on Discovery but rebind it to a discovery-scan-native event (for example, a shadow app discovered via network or DNS scan).

Recommended: c. REVERSED from the prior recommendation (was a) after the vendor check. The vendor evidence supports two facts at once: discovery products genuinely DO surface shadow and unmanaged IT, but through network and DNS scanning, not through single-sign-on logs. runZero markets unmanaged-device discovery via unauthenticated network scanning; Lansweeper's passive and credential-free fingerprinting flags unknown and unmanaged assets; Axonius identifies unmanaged devices accessing SaaS. None of them detect shadow IT by reading an identity provider's sign-on stream, which is the SaaS-management tool's native channel. So Discovery should keep emitting the signal (option a is right that discovery detects shadow IT), but the trigger should be a scan-native event rather than the single-sign-on event it currently fires on (which belongs to the SaaS-management side). Option b would wrongly drop discovery's legitimate detection capability; option a keeps a mis-sourced trigger. Rebinding the event to a new discovery-scan-native trigger is a destructive re-attribution, so it needs your sign-off before anything moves.

a5:

---

## Optional (will not hold up the build)

q6: Eight extra entity candidates show up across the flagship discovery and asset-visibility vendors (discovery patterns, discovery credentials, discovery schedules, reconciliation rules, discovery exclusions, network segments, cloud accounts, asset tags). Should I research and add the ones that hold up, placing each in its realizing module? (yes/no)

Recommended: yes, and the fresh vendor surface already confirms most of them as Core. Discovery credentials, discovery patterns, discovery schedules, discovery exclusions, and network segments appear as first-class config across the scanning vendors (ServiceNow patterns and credential tables, BMC credential brokers, Device42 auto-discovery rules, Lansweeper credential vault and scan scopes, runZero scan templates and scope). Cloud accounts are a Core master once Cloud Inventory exists (every cloud-discovery vendor scopes by subscription or project). The two that warrant a closer look: reconciliation rules overlap heavily with the CMDB side, and asset tags may belong to a shared or cross-cutting area rather than Discovery. Best done after the modules exist so each lands in its realizing module.

a6:

---

<!-- agent map, ignore: q1=B2-MOD-SHAPE q2=B1A-BUILD q3=B2-MON-POLICIES q4=B2-SVC-MAPS q5=B2-SHADOW-IT q6=B3-DISCOVERY-PATTERNS+B3-DISCOVERY-CREDENTIALS+B3-DISCOVERY-SCHEDULES+B3-RECONCILIATION-RULES+B3-DISCOVERY-EXCLUSIONS+B3-NETWORK-SEGMENTS+B3-CLOUD-ACCOUNTS+B3-ASSET-TAGS | domain_id=5 | phase0=.tmp_deploy/DISCOVERY-phase0-2026-06-08.md | reversed: B2-SHADOW-IT a->c -->
