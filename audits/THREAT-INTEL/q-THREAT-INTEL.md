# Threat Intelligence (THREAT-INTEL): questions waiting for you

## What this domain is
Aggregate threat indicators and adversary intelligence from open and commercial feeds, then push curated signals into your detection stack.

Pull threat indicators (hashes, IPs, domains, URLs, CVEs) from open feeds, commercial intelligence providers, and ISAC sharing communities into a single curated catalog. Normalize across STIX/TAXII, MISP, and vendor formats; deduplicate; score by confidence and relevance to your environment. Track threat actors, campaigns, and malware families with the techniques they use, mapped to the MITRE ATT&CK framework. Author finished-intelligence reports for stakeholders and route them to SOC analysts, incident responders, and executive leadership. Push high-confidence indicators directly into your SIEM, EDR, firewall, and DNS sinkholes for blocking and detection, track sightings when your telemetry matches a known indicator, manage Priority Intelligence Requirements so collection focuses where leadership cares most, and share indicators back to the community in TLP-aware formats.

---

q1: (answer this first) How should Threat Intelligence be split into modules (the sub-areas of the product)?

- a) Two modules: Curation (the analytic substrate: indicators, actors, campaigns, malware, techniques, reports, requirements) and Operationalization (the deployment side: sightings, blocklists, feeds, subscriptions, consumers).
- b) Four lifecycle-stage modules: collection, processing, analysis, dissemination (the analyst-textbook canonical breakdown).
- c) One platform module plus a lightweight starter module.

Recommended: a. Mirrors how the leading platforms (Recorded Future, ThreatConnect, Mandiant) present their product, and with seven to nine capabilities it clears the two-module floor with headroom. This choice drives every module, capability, master, role, and skill below it, so it unlocks the rest of the build.

a1:

---

q2: The buyer-facing catalog copy (tagline and description) was drafted and saved for this domain and is awaiting your sign-off. Approve it as written? (yes/no)

Recommended: yes. The copy is in buyer voice (workflow plus value, no vendor names) and is the text shown in "What this domain is" above; answer no if you want to supply edited wording instead, which would overwrite the saved text.

a2:

---

q3: For threat actors, campaigns, malware families, and attack techniques, which of these should carry a workflow (draft, review, publish, archive) versus being treated as plain reference lists?

- a) Treat all four as plain reference lists (no workflow).
- b) Give threat actors a workflow (draft, peer-reviewed, published, archived); keep the other three as reference lists.
- c) Give both threat actors and intelligence reports a workflow; keep campaigns, malware families, and attack techniques as reference lists.

Recommended: a. Most platforms registry-shape these (Recorded Future treats actors as a reference catalog), and intelligence reports already carry their own publish workflow regardless of this pick. Choose b or c only if your analysts formally review-and-publish actor profiles.

a3:

---

q4: Two capabilities (enrichment and intelligence sharing) are used by other security domains too. Should either be promoted to a shared, domain-neutral capability rather than living only under Threat Intelligence?

- a) Keep both under Threat Intelligence (lowest authoring cost).
- b) Promote enrichment to a shared capability spanning Threat Intelligence, SOAR, DLP, and Vulnerability Management; keep sharing under Threat Intelligence.
- c) Promote both to shared capabilities.

Recommended: b. Enrichment APIs (Recorded Future, VirusTotal, Anomali Lens, Mandiant) are genuinely consumed from SOAR, DLP, and Vulnerability Management contexts, so it reads as a real shared market; ISAC-style sharing is more of an internal workflow than a cross-domain market.

a4:

---

q5: Where should the MITRE ATT&CK technique catalog (attack techniques) live?

- a) Threat Intelligence owns it, and other domains reference or embed it.
- b) Create a separate shared security-frameworks domain to own it, and have Threat Intelligence consume it (this queues a new-domain candidate).
- c) Make it a platform-wide built-in list.

Recommended: a. Threat Intelligence is the natural home today and other domains can embed it; a dedicated frameworks domain is worth it only if several domains end up needing the same MITRE catalog and there is appetite to stand up a new domain.

a5:

---

q6: Replace the British spelling "operationalisation" with American "operationalization" in the Threat Intelligence domain description? (yes/no)

Recommended: yes. It violates the American-English rule, but it overwrites an existing (non-empty) value, so it needs your sign-off before the change is applied.

a6:

---

## Optional (will not hold up the build)

q7: Eight extra objects show up across the flagship Threat Intelligence vendors (indicator sightings, feed registry, per-tenant feed subscriptions, indicator blocklists pushed to controls, per-indicator enrichment records, downstream intel consumers, collection plans tied to requirements, and a TLP classification list). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Indicator sightings and the feed objects are the strongest signals; the rest want a quick verification pass first.

a7:

---

q8: Three regulatory regimes touch Threat Intelligence programs (PCI-DSS intrusion-detection and incident-response requirements, GDPR security-of-processing, and the US CISA Automated Indicator Sharing program). Should I tag the relevant ones onto this domain? (yes/no)

Recommended: yes. PCI-DSS and GDPR rows almost certainly already exist and can be linked cheaply; CISA Automated Indicator Sharing likely needs a new regulation row created first. Additive and non-blocking.

a8:

---

<!-- agent map, ignore: q1=B2-T1 q2=B2-T2 q3=B2-T3 q4=B2-T4 q5=B2-T5 q6=B1A-T14 q7=B3-T1+B3-T2+B3-T3+B3-T4+B3-T5+B3-T6+B3-T7+B3-T8 q8=B3-T10+B3-T11+B3-T12 | domain_id=14 -->
