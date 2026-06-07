# Discovery (DISCOVERY): questions waiting for you

## What this domain is

Find every device, server, cloud resource, and service running across your network and cloud accounts, without anyone telling it where to look. It scans networks, queries cloud APIs, and inspects systems with credentials to build an accurate, continuously refreshed inventory, then feeds clean records downstream into your CMDB and asset registers.

---

q1: (answer this first) How should Discovery be split into modules (the sub-areas of the product)?

- a) Single module: one DISCOVERY-ENGINE covering scans, sources, and discovered candidates (only viable if the capability count stays very small).
- b) Two modules: Network Scan (network probes) and Cloud Inventory (cloud APIs).
- c) Three modules: Network Scan, Cloud Inventory, and Service Mapping (service-dependency mapping as its own area).
- d) Four modules: the three above plus Reconciliation (rules that normalize and match discovered items into config records).

Recommended: c. Three modules match how the leading discovery products package these areas, and pulling Service Mapping into its own module triangulates cleanly against the existing service-maps owner in the CMDB area. This choice drives every module, capability, lifecycle, role, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: Discovery is currently the unbuilt domain, so nothing exists yet to model. Once you pick the shape in q1, should I go ahead and author the full build (capabilities, modules, masters, lifecycle states, roles, and the single domain-grain skill)? (yes/no)

Recommended: yes. This is the additive build that the shape decision unblocks; it is what makes the domain deployable. Nothing destructive happens here.

a2:

---

q3: Which domain should canonically own monitoring policies once the new ownership layer replaces the legacy one?

- a) ITOM (operations-platform centric).
- b) RMM (remote-management centric).

Recommended: this is really an ITOM and RMM decision, and you can safely defer it to their next audits. Discovery only contributes to monitoring policies, it does not own them, so it does not block the Discovery build. Pick one only if you want to settle it now.

a3:

---

q4: Should service maps stay owned by the CMDB service-mapping area, with Discovery just publishing scan-completed events into it (option b), or should Discovery take over ownership in a dedicated Service Mapping module (option a)?

- a) Move ownership to a Discovery Service Mapping module (only makes sense if you chose three or four modules in q1); CMDB then steps down to a consumer.
- b) Keep CMDB as the canonical owner; Discovery keeps publishing scan-completed events as it does today. No further action.

Recommended: b. Discovery already publishes the upstream events, and keeping CMDB as the owner avoids reshuffling a master that is working today. Confirm before I author the internal relationships around discovered devices and service maps.

a4:

---

q5: One handoff publishes an unsanctioned-app signal from Discovery to your SaaS Management area, but that signal is really fed by single sign-on data, which is the SaaS Management area's own native channel rather than a discovery scan. How should it be handled?

- a) Keep it outbound from Discovery as it is today (Discovery does detect shadow IT through network and DNS scanning).
- b) Re-source the handoff so the SaaS Management area publishes it instead; Discovery drops it from its outbound set.
- c) Keep the handoff on Discovery but rebind it to a discovery-scan-native event (for example, a shadow app discovered via network scan).

Recommended: a, unless you want a stricter source boundary. Options b and c are destructive re-attributions, so they need your sign-off before anything moves.

a5:

---

## Optional (will not hold up the build)

q6: Eight extra entity candidates show up across the flagship discovery and asset-visibility vendors (discovery patterns, discovery credentials, discovery schedules, reconciliation rules, discovery exclusions, network segments, cloud accounts, asset tags). Should I research and add the ones that hold up, placing each in its realizing module? (yes/no)

Recommended: yes, but additive and best done after the modules exist. A few (discovery patterns, discovery credentials, reconciliation rules) vary a lot by vendor and want a verification pass first, and a couple (cloud accounts, asset tags, network segments) may belong to a shared or cross-cutting area rather than Discovery.

a6:

---

<!-- agent map, ignore: q1=B2-MOD-SHAPE q2=B1A-BUILD q3=B2-MON-POLICIES q4=B2-SVC-MAPS q5=B2-SHADOW-IT q6=B3-DISCOVERY-PATTERNS+B3-DISCOVERY-CREDENTIALS+B3-DISCOVERY-SCHEDULES+B3-RECONCILIATION-RULES+B3-DISCOVERY-EXCLUSIONS+B3-NETWORK-SEGMENTS+B3-CLOUD-ACCOUNTS+B3-ASSET-TAGS | domain_id=5 -->
