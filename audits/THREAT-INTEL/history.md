# THREAT-INTEL audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 modules** (M1 hard-fail blocker per Rule #14, applies even to leadership-tier domains); 0 masters (THREAT-INTEL is on the leadership-tier exception list for B1, so master-count alone is not a blocker, but Rule #14 still mandates >=1 module); 0 capabilities (A2 hard fail); 5 solutions (4 primary, 1 secondary); 0 regulations (B-band gap given GDPR/PCI/sector CTI-sharing regimes touch every TI program); 1 business_function_domains row (`Security Operations Center` owner only, no contributors); 0 trigger_events anchored on a THREAT-INTEL master (vacuous given zero masters); 0 outbound + 0 inbound `handoffs` rows (THREAT-INTEL is wholly invisible in the cross-domain handoff substrate); 0 lifecycle states; 0 data_object_aliases; 0 data_object_relationships; 0 skills rows; 0 roles; 0 role_modules; 0 role_permissions; 0 domain_aliases for catalog discoverability. Catalog UX fields (`catalog_tagline`, `catalog_description`) both empty (A4 fail). The `business_logic` column on `domains.id=14` contains a U+2014 em-dash character (carried over from a prior load before Rule #14 / em-dash hygiene); flagged as a sanitization candidate, not blocking.
- **Vendor-surface basis (Phase 2 inline, no recursive subagent):** Recorded Future Intelligence Cloud, Anomali ThreatStream, ThreatConnect Platform, Mandiant Advantage Threat Intelligence, Microsoft Defender Threat Intelligence (Riskiq), CrowdStrike Falcon Intelligence, IBM X-Force Exchange, Group-IB Threat Intelligence, ServiceNow Threat Intelligence (workflow shell on top of TIP feeds), Palo Alto Cortex XSOAR Threat Intelligence Management. Specialist pure-plays: Recorded Future, Anomali, ThreatConnect, Group-IB. Endpoint-vendor TI shells: CrowdStrike, Microsoft Defender TI. Workflow-aggregator shells: ServiceNow, XSOAR. The catalog has 5 of the 10 enumerated; missing flagships: Mandiant, Microsoft Defender TI, CrowdStrike Falcon Intel, IBM X-Force, Group-IB.
- **Bucket 1 (in-scope, agent fixable):** 13 items (1 M-band hard fail + 1 A-band hard fail + 1 A-band UX gap + 1 C-band soft fail + 1 B-band foundation fail (master entity authoring) + 6 dependent B/F/E-band gaps gated on B1-T1 + 2 commerce-layer extensions + 1 domain_aliases population). H1 (APQC TAGGING) is **vacuously not a finding** because there are zero cross-domain handoffs to tag; an APQC pass becomes meaningful only once B1-T6/T7 land.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 12 items (8 missing entities + 1 modularization proposal + 3 regulation candidates).
- **Candidates queued:** 4 (SIEM, XDR, DRP, CAASM bumped to 2).
- **Status set:** `feedback_needed`.

### Vendor surface basis

The Phase 2 surface walked above is from my own market knowledge, not a formal Phase 0 document. The five flagship pure-plays (Recorded Future, Anomali, ThreatConnect, Mandiant Advantage, Group-IB) all converge on the same core entity model: indicator records (atomic IOCs: hashes, IPs, domains, URLs, CVEs, file paths), threat actors / adversaries (named groups with TTPs), campaigns (operational clusters tying actors to victims and tooling), TTPs (MITRE ATT&CK techniques), malware families, reports / intelligence products, finished-intelligence pieces (curated analyst output), intel requirements (PIRs from leadership), and sightings (instances of an indicator observed inside the org). Endpoint-vendor TI surfaces (CrowdStrike, Microsoft Defender TI) skew toward indicator + sighting + actor profile, lighter on finished-intelligence and PIR workflows. Workflow shells (ServiceNow, XSOAR) inherit the indicator + sighting layer from upstream feeds and add case-management on top. The compliance specialist axis is thin (CTI overlaps PCI-DSS Req 11.4 threat-detection requirements and GDPR Art 32 security-of-processing, but no flagship sells solely on a CTI-compliance pitch); list-based regulator sharing (CISA AIS, MISP-community, sector ISACs) is a workflow surface, not a vendor market.

### Neighbor discovery (auto-derived from handoffs + DMDO; ranked by edge weight)

**Auto-discovery vacuous:** THREAT-INTEL has zero `handoffs` rows in either direction and zero `domain_module_data_objects` rows (no modules at all). No neighbor can be ranked from live state. The neighbors below are the **implied** neighbor set from the catalog's domain topology (parent = SECOPS; siblings = SOAR, VULN-MGMT; market-adjacent = ITSM, CMDB, IGA, DLP, GRC, ITAM, SAM, HAM); they will only become real once B1-T6/T7 are loaded (modules + masters + cross-domain handoffs).

| Implied neighbor | Why it should appear once T6/T7 land | Pass shape |
|---|---|---|
| SECOPS (parent) | Sightings + indicator matches feed SECOPS incident triage; TI consumed during investigation. | Pairwise (full) after T6/T7 |
| SOAR (sibling) | SOAR runbooks call TI enrichment APIs; indicator-block playbooks act on TI sightings. | Pairwise (full) after T6/T7 |
| VULN-MGMT (sibling) | Adversary exploitation evidence on CVEs reprioritizes vuln backlog. | Pairwise (full) after T6/T7 |
| ITSM | Major-incident bridge consumes finished-intelligence briefings. | Lightweight |
| CMDB | Indicator-sighting on asset surfaces CI-level compromise risk. | Lightweight |
| DLP | Indicator catalog feeds DLP policy authoring (file hashes, URL blocklists). | Lightweight |
| GRC | Threat assessments feed risk register entries. | Lightweight |
| IGA | Adversary-attributed credential leaks trigger access reviews. | Lightweight |
| DSPM | Data-exfiltration TTPs inform DSPM control prioritization. | Lightweight |

The dominant pairwise finding is the same as DLP's audit two days ago: **THREAT-INTEL is vacuously absent from the handoff substrate** because it has no masters and no modules. Every cross-domain edge that the catalog topology implies should exist (e.g. `threat_indicator.matched_in_telemetry` from THREAT-INTEL to SECOPS; `cve.actively_exploited` from THREAT-INTEL to VULN-MGMT) is missing because the publishing entities themselves don't exist. Pairwise reconciliation cannot find anything to diff against; the foundation has to land first.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (A / M / C / B / F / E)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-T1 | **M1 (hard fail) - BLOCKING** | `domain_modules?domain_id=eq.14` returns zero rows. THREAT-INTEL has no deployable unit. Rule #14 floor is >=1 `module_kind='full'` row for every `domains` row, including leadership-tier domains (the leadership exception applies to B1's master requirement, not to M1's module requirement). Since A2 will land >=3 capabilities, M2's >=2 module floor will also kick in. Proposed module split per market practice (see Bucket 3): (a) `THREAT-INTEL-CURATION` masters the analytic substrate (`threat_indicators`, `threat_actors`, `campaigns`, `malware_families`, `attack_techniques` linked to MITRE ATT&CK, `intelligence_reports`, `intel_requirements`); (b) `THREAT-INTEL-OPERATIONALIZATION` masters the deployment-side surface (`indicator_sightings`, `indicator_blocklists`, `tip_feeds`, `feed_subscriptions`, `intel_consumers`). | Phase A load: create 2 `domain_modules` rows with `module_kind='full'`, populate `domain_module_capabilities` once A2 capabilities exist, populate `domain_module_data_objects` once B1-T6/T7 masters exist. Lifecycle states, workflow-gate permissions, and system-skill split (Rule #17) follow in the same load. |
| B1-T2 | **A2 (hard fail) - BLOCKING** | `capability_domains?domain_id=eq.14` returns zero rows. Per Rule #14 a domain with <3 capabilities collapses to a single module; a domain with >=3 capabilities needs >=2 modules. THREAT-INTEL's vendor surface comfortably supports 7-9 capabilities: `TI-INDICATOR-LIFECYCLE` (IOC ingestion, deduplication, scoring, expiration), `TI-ADVERSARY-TRACKING` (actor profiling, attribution, motivation analysis), `TI-CAMPAIGN-ANALYTICS` (campaign clustering, victimology, target-sector analysis), `TI-FEED-MGMT` (commercial + open feed ingestion, format normalization between STIX/TAXII/MISP/CSV), `TI-FINISHED-INTELLIGENCE` (analyst report authoring, peer review, dissemination), `TI-INTEL-REQUIREMENTS` (PIRs, collection-plan management, gap analysis), `TI-ENRICHMENT` (passive DNS, WHOIS, geolocation, sandbox detonation), `TI-OPERATIONALIZATION` (indicator block-listing, SIEM/firewall/EDR push, sighting telemetry ingestion), `TI-COLLABORATION-SHARING` (TLP labeling, ISAC participation, MISP-community sharing). | Author the capability rows + `capability_domains` junctions, apply Rule #2 point-solution test for any cross-cutting candidate (`TI-ENRICHMENT` and `TI-COLLABORATION-SHARING` may qualify for domain-neutral codes per the Cross-cutting capability convention; see Bucket 2). Load via the standard Phase-A capability loader pattern. |
| B1-T3 | **A4 (hard fail)** | `catalog_tagline` and `catalog_description` are both empty strings. Per Rule #20 these are buyer-shaped fields and must be drafted in buyer voice (workflow + value), not analyst voice. **Per Rule #20 the agent does NOT auto-write these; drafts go to the user for review BEFORE writing.** | Surface a draft pair in Bucket 2 (B2-T2). User approves wording. Load via PATCH. |
| B1-T4 | **A1 sanitization (soft)** | `domains.id=14.business_logic` contains a U+2014 em-dash. Per project rules (CLAUDE.md) em-dashes are forbidden everywhere in catalog content. The fact_sheet emitter sanitizes at render time but the source value should be cleaned. Existing text: `"Indicator correlation, enrichment pipelines, and adversary attribution {EM-DASH} analytic substrate beneath a curation workflow."`. | PATCH the value to use a colon or sentence break instead of the em-dash. Proposed replacement: `"Indicator correlation, enrichment pipelines, and adversary attribution: analytic substrate beneath a curation workflow."`. Single-row PATCH via surgical CLI. |
| B1-T5 | **C1 (soft)** | `business_function_domains?domain_id=eq.14` carries one `owner` row (`Security Operations Center`) but zero contributors or consumers. THREAT-INTEL is consumed by SOC analysts, vulnerability managers, incident responders, threat hunters, fraud teams (in financial-services orgs), and executive leadership (finished-intelligence briefings). At minimum 2-3 contributor rows expected. | Insert contributor rows: `Information Security` (contributor for indicator-blocking ops), `Risk and Compliance` (consumer for finished-intelligence + risk-register feed). Loader pattern: same as ATS/HCM-area C1 fixes. |
| B1-T6 | **B-band foundation (hard fail given leadership exception)** - **MASTER ENTITY AUTHORING** | Despite leadership-tier B1 exemption, the vendor surface unambiguously identifies 5-7 entities every flagship masters; the exemption was authored for domains with **truly no masters** (REV-INTEL, SALES-PERF, FINOPS), not for analytic markets with rich substrate. THREAT-INTEL belongs in the second class. Proposed masters (apply Rule #9 naming arbitration; bare-word `indicators` and `campaigns` collide with existing patterns, so prefer `threat_indicators` and `threat_campaigns`): `threat_indicators` (atomic IOC: hash, IP, domain, URL, CVE, file path; pattern flags `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`); `threat_actors` (named adversary groups: APT29, FIN7); `threat_campaigns` (operational clusters tying actors to tools and victims); `malware_families` (named malware with variants); `attack_techniques` (MITRE ATT&CK technique reference: a config-shaped reference master, see B2-T3); `intelligence_reports` (analyst finished-intelligence: pattern flag `has_submit_lock=true` at `published`); `intel_requirements` (PIRs - Priority Intelligence Requirements). | Phase B load after B1-T1/T2: author 7 master `data_objects` rows + `domain_module_data_objects` rows mapping each to the correct module (CURATION vs. OPERATIONALIZATION). Apply Rule #9 naming arbitration on each. Lifecycle states per B1-T7. |
| B1-T7 | **B12 (gated on T6)** | Zero `data_object_lifecycle_states`. Once B1-T6 lands, expected machines: `threat_indicators (ingested -> deduplicated -> enriched -> scored -> active -> expired | retracted)` with workflow gate at `active` and at `retracted`; `intelligence_reports (draft -> in_review -> approved -> published -> archived)` with submit_lock at `published`; `threat_actors`, `threat_campaigns`, `malware_families` are likely config-shaped registry masters (append-rare-edit pattern; candidate for the Rule #12 exemption, see B2-T3); `intel_requirements (proposed -> approved -> active -> retired)` with a single-approver pattern. | Draft state machines per master once T6 lands. Workflow-gate permissions then materialize per the per-module derivation rule. |
| B1-T8 | **B6 (gated on T6) - intra-domain relationships** | Zero `data_object_relationships` because zero masters. Once T6 lands, required edges: `threat_indicators attributed_to threat_actors`; `threat_indicators part_of threat_campaigns`; `threat_actors uses attack_techniques`; `threat_actors uses malware_families`; `threat_campaigns targets threat_actors` (inverse); `malware_families implements attack_techniques`; `intelligence_reports analyzes threat_actors`; `intelligence_reports cites threat_indicators`; `intel_requirements scopes threat_actors`. | Draft 9-12 relationship rows once T6 lands; load via cluster-drafts pattern. |
| B1-T9 | **B7 (gated on T6) - users-edge relationships** | Zero `users -> master` edges because zero masters. Every master needs at least one user-typed actor under Rule #10. Expected edges: `users authors intelligence_reports`; `users reviews intelligence_reports`; `users approves intel_requirements`; `users ingests threat_indicators` (in workflow-aware TIPs; in fully-automated feed paths the user edge is the curator who tunes ingestion rules); `users attributes threat_actors`. | Load 4-5 `users -> master` relationship rows once T6 lands. Pattern matches Rule #10. |
| B1-T10 | **B11 (gated on T6) - aliases** | Zero `data_object_aliases`. Cross-vendor terminology drifts heavily: `threat_indicators <-> IOCs <-> observables (in STIX 2.x) <-> sightings (when matched)`; `threat_actors <-> adversaries <-> intrusion sets (STIX) <-> APTs`; `threat_campaigns <-> operations <-> intrusion campaigns`; `attack_techniques <-> TTPs <-> MITRE ATT&CK techniques`; `intelligence_reports <-> finished intelligence <-> intel briefings <-> STIX reports`. | Draft 12-18 alias rows once T6 lands (2-3 per master, both industry-standard and vendor-specific). |
| B1-T11 | **F2/F3/F4/F7 (gated on T1)** - SYSTEM SKILLS | Zero skills, zero tools, zero skill_tools. Rule #17 mandates one `system` skill per `domain_modules` row with >=1 `skill_tools` row. Once two modules exist: `threat_intel_curation_agent` (skill_type=system, domain_module_id=<curation id>) with tools like `query_threat_indicators`, `query_threat_actors`, `create_intelligence_report`, `update_intelligence_report_status`, `enrich_indicator` (side_effect to enrichment APIs), `notify_person` (analyst peer-review notifications); `threat_intel_operationalization_agent` (skill_type=system, domain_module_id=<ops id>) with tools like `query_indicator_sightings`, `query_indicator_blocklists`, `push_indicator_to_blocklist` (side_effect to SIEM/firewall/EDR), `receive_sighting_telemetry` (inbound), `notify_team` (broadcast on high-confidence indicator match). F4 invariant: `query`/`mutate` set `data_object_id`; `side_effect`/`compute` NULL; `inbound` optional. F7: default to `notify_person`/`notify_team` over channel primitives. | Phase-S load alongside the module load. |
| B1-T12 | **E1/E2/E3/E4 (gated on T1)** - ROLES | Zero roles. Once 2 modules exist, E1 mandates >=3 distinct roles. Expected roles: `INFORMATION-SECURITY-THREAT-INTEL-ANALYST` (function-scoped to `Information Security`, primary on CURATION, secondary on OPERATIONALIZATION); `INFORMATION-SECURITY-THREAT-HUNTER` (primary on OPERATIONALIZATION, secondary on CURATION; consumes finished intelligence + sighting telemetry); `INFORMATION-SECURITY-CTI-MANAGER` (manager-tier cross-functional, primary on both modules, owns intel-requirements lifecycle); optionally `SECURITY-OPERATIONS-INCIDENT-RESPONDER` as a cross-domain consumer with `interaction_level='secondary'` on OPERATIONALIZATION. | Author after B1-T1 lands; load with function-scoped naming; explicit `interaction_level` per E3. |
| B1-T13 | **Discoverability - domain_aliases** | Zero `domain_aliases` for THREAT-INTEL. Per Rule #20, aliases feed both catalog search and per-domain skill trigger phrases. Expected aliases: `CTI` (Cyber Threat Intelligence), `TIP` (Threat Intelligence Platform), `threat intel`, `cyber threat intelligence`, `IOC management`, `indicator management`. | Load 5-6 alias rows. Single PATCH on `domain_aliases` table. No dependencies. |

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1, A2, A4 UX gap, A1 em-dash sanitization, C1, B6, B7, B11, B12, F2/3/4/7, E1/2/3/4) | 12 |
| DISCOVERABILITY (domain_aliases) | 1 |
| APQC TAGGING | 0 (vacuous: zero cross-domain handoffs to tag) |
| MISSING (entity gap, agent-fixable subset) | 0 in Bucket 1; 8 candidates routed to Bucket 3 since they need Phase 0 vetting against the full vendor surface |
| WRONG-OWNERSHIP / SCOPE-CREEP | 0 (vacuous: nothing in the catalog to be wrongly owned or out-of-scope) |
| **Bucket 1 total** | **13** |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-T1 | **Module split topology** (B1-T1 prerequisite). The proposed split is `THREAT-INTEL-CURATION` (analytic substrate: actors, campaigns, indicators, reports) vs. `THREAT-INTEL-OPERATIONALIZATION` (sightings, blocklists, feed plumbing). Recorded Future and ThreatConnect ship this split implicitly; Anomali bundles harder; Mandiant Advantage leans curation-heavy (operationalization is in Mandiant Security Validation as a separate product). Alternative split: by **lifecycle stage** (`TI-COLLECTION`, `TI-PROCESSING-ENRICHMENT`, `TI-ANALYSIS`, `TI-DISSEMINATION`) which mirrors the canonical CTI lifecycle (collection -> processing -> analysis -> dissemination -> feedback). Third option: a single `THREAT-INTEL-PLATFORM` module since the market is still consolidated under one-product-per-vendor; defer the split until consolidation pressure eases. | Modularization design choice with downstream effects on capability assignment, master attribution, role bundles, and Phase-S load shape. The CURATION/OPERATIONALIZATION split has the strongest support from the vendor product taxonomy; the lifecycle-stage split is more analyst-textbook-correct but creates four small modules with overlapping masters; the single-module shape under-uses Rule #14's >=2-module floor for >=3-capability domains. | (a) CURATION + OPERATIONALIZATION (recommended for vendor neutrality + Rule #14 compliance with capability count); (b) Four lifecycle-stage modules; (c) Single THREAT-INTEL-PLATFORM module + a `THREAT-INTEL-LITE` starter (Rule #19) for the SOC-fronted minimal shape. |
| B2-T2 | **Catalog UX wording draft** (B1-T3). Draft `catalog_tagline` (buyer voice, single sentence): *"Aggregate threat indicators and adversary intelligence from open and commercial feeds, then push curated signals into your detection stack."*. Draft `catalog_description` (buyer voice, 1-3 paragraphs): *"Pull threat indicators (hashes, IPs, domains, URLs, CVEs) from open feeds, commercial intelligence providers, and ISAC sharing communities into a single curated catalog. Normalize across STIX/TAXII, MISP, and vendor formats; deduplicate; score by confidence and relevance to your environment. Track threat actors, campaigns, and malware families with the techniques they use, mapped to the MITRE ATT&CK framework. Author finished-intelligence reports for stakeholders and route them to SOC analysts, incident responders, and executive leadership."*<br><br>*"Push high-confidence indicators directly into your SIEM, EDR, firewall, and DNS sinkholes for blocking and detection. Track sightings when your telemetry matches a known indicator. Manage Priority Intelligence Requirements (PIRs) to focus collection where leadership cares most. Share indicators back to the community in TLP-aware formats."*. Per Rule #20 the agent doesn't write these without user approval. | Marketing voice and buyer-vs-analyst-voice calibration are user-owned. Drafts above are first-cuts. | (a) Approve drafts as-is; (b) Edit and approve; (c) Defer A4 to a separate marketing-voice review pass. |
| B2-T3 | **Lifecycle-state exemptions (B1-T7)** for `threat_actors`, `threat_campaigns`, `malware_families`, and `attack_techniques`. The first three are append-rare-edit registries (an actor profile is born when the analyst pins a name, edited as new evidence accrues, retired but not archived); the fourth (`attack_techniques`) is effectively a foreign-key into the MITRE ATT&CK matrix and a candidate for `kind='platform_builtin'` or for the embedded_master pattern from a separate `MITRE-ATTACK` reference master. Per Rule #15 the exemption decision lives in this audit, not in `data_objects.notes`. | Whether these are workflow-bearing or config-shape is a substantive call. Vendor practice varies: Anomali treats `threat_actors` as a workflow record with state machine (`draft -> peer_reviewed -> published`); Recorded Future treats them as a config-style registry. | (a) Exempt all four as config-shape (skip lifecycle states); (b) Author lifecycle states for `threat_actors` only (`draft -> peer_reviewed -> published -> archived`); (c) Author lifecycle states for `threat_actors` and `intelligence_reports` (already in Bucket 1); leave `threat_campaigns`, `malware_families`, `attack_techniques` config-shaped. |
| B2-T4 | **Cross-cutting capability promotion (B1-T2 ramification)**. `TI-ENRICHMENT` (passive DNS, WHOIS, geolocation, sandbox detonation) and `TI-COLLABORATION-SHARING` (ISAC participation, MISP-community sharing) plausibly span THREAT-INTEL + DSPM + DLP + SOAR + VULN-MGMT under different brand names. Per the Cross-cutting capability convention, the Rule #2 test asks: can I name three independent vendors marketing this capability across >=3 of the candidate domains? Recorded Future, VirusTotal Premium, Anomali Lens, Mandiant Advantage all sell enrichment APIs hit from SOAR, DLP, VULN-MGMT contexts. ISAC sharing is a workflow surface, less clearly a vendor market. | Cross-cutting promotion has downstream effects on Phase-A loader shape and on which `capability_domains` rows ship in this load vs. as a follow-up. | (a) Author both as domain-prefixed (`TI-ENRICHMENT`, `TI-COLLABORATION-SHARING`) - lowest authoring cost; (b) Promote `TI-ENRICHMENT` to domain-neutral `THREAT-ENRICHMENT` and link to THREAT-INTEL, SOAR, DLP, VULN-MGMT; (c) Promote both and explicitly enumerate the cross-domain links. |
| B2-T5 | **`MITRE-ATTACK` reference master architecture (B1-T6 ramification)**. MITRE ATT&CK techniques are a public reference framework with stable IDs (T1059, T1486, etc.); treating each technique as a row in THREAT-INTEL's `attack_techniques` master creates duplicates across every TI-adjacent domain that references them (SOAR playbooks reference techniques, VULN-MGMT exploit-mapping references techniques, DLP detection rules reference techniques). Three architectural options: (a) THREAT-INTEL masters `attack_techniques`; everyone else `consumer + embedded_master`; (b) a new domain `MITRE-FRAMEWORKS` (or `SECURITY-FRAMEWORKS`) masters `attack_techniques`, `cve_catalog`, `cwe_catalog`, etc. as a shared reference module; THREAT-INTEL consumes; (c) `attack_techniques` becomes `kind='platform_builtin'` (currently only `users` is built-in, so this would extend the seed-list semantics). | Cross-domain master architecture is a substantive design call with deploy-time effects on master demotion behavior, embedded_master shells, and the deployer's contract. | (a) THREAT-INTEL masters (simplest, mirrors flagship vendor product shape); (b) Promote a `SECURITY-FRAMEWORKS` master domain (cleanest for the cross-domain reference-data use case; new domain queue candidate); (c) Built-in (heaviest precedent, changes platform contract). |

### Bucket 3 - Phase 0 pending (speculative; vendor knowledge basis)

The THREAT-INTEL surface is currently 100% empty. Bucket 3 lists the substrate every flagship masters that should land in a vetted Phase 0 pass; everything below is from my own market knowledge, not from a formal subagent vendor-research artifact.

#### MISSING (8) - proposed module assignment

| Entity | Proposed module | Vendor evidence |
|---|---|---|
| `indicator_sightings` | THREAT-INTEL-OPERATIONALIZATION | Recorded Future "Sightings", ThreatConnect "Observations", Anomali "Sightings", Mandiant "Indicator Matches". First-class record of every telemetry hit against a known indicator. |
| `tip_feeds` | THREAT-INTEL-OPERATIONALIZATION | The feed master itself (one row per commercial feed, open feed, ISAC, MISP community). Anomali "Feeds", ThreatConnect "Sources", Recorded Future "Source Catalog". Config-shape registry. |
| `feed_subscriptions` | THREAT-INTEL-OPERATIONALIZATION | Per-tenant subscription state per feed (active, paused, throttled, errored). Distinct from feed master. |
| `indicator_blocklists` | THREAT-INTEL-OPERATIONALIZATION | The push-side artifact: the set of indicators currently provisioned to a downstream control (SIEM allow/deny, firewall blocklist, EDR custom IOC list). Tracks expiration, false-positive retraction, push targets. |
| `enrichment_records` | THREAT-INTEL-CURATION | Per-indicator enrichment outputs (passive DNS, WHOIS, geolocation, sandbox detonation). One per (indicator x enrichment source) pair. ThreatConnect "Enrichments", Recorded Future "Intelligence Cards". |
| `intel_consumers` | THREAT-INTEL-OPERATIONALIZATION | First-class record of downstream consumers of TI (SOC team, incident-response team, fraud team, executive briefing audience). Drives dissemination workflows + finished-intelligence routing. |
| `intel_collection_plans` | THREAT-INTEL-CURATION | Collection plans tied to PIRs (intel_requirements): which sources to query, what coverage gaps to address. Group-IB and Mandiant Advantage model this explicitly; pure-plays implicit. |
| `tlp_classifications` | THREAT-INTEL-CURATION (config-shape) | Traffic-Light-Protocol classification registry (TLP:RED, TLP:AMBER, TLP:GREEN, TLP:CLEAR). Drives sharing-controls behavior; config-shape reference master. |

(Several of these may collapse onto pure `data_object_relationships` or per-master columns rather than first-class masters - to be decided per-entity at fix time.)

#### MODULARIZATION (1)

- **2-module split** (`THREAT-INTEL-CURATION` + `THREAT-INTEL-OPERATIONALIZATION`) is the recommended baseline per B2-T1, mirroring the leader-product navigation at Recorded Future, ThreatConnect, and Mandiant Advantage. With 7-9 capabilities (B1-T2), Rule #14 floor of 2 modules is met with headroom. The lifecycle-stage split (4 small modules) and the single-module shape are the alternatives the user may pick under B2-T1.

#### REGULATION CANDIDATES (3)

THREAT-INTEL has zero `domain_regulations` rows. CTI programs sit beneath three primary regulatory layers:

| Regulation candidate | applicability | Why |
|---|---|---|
| PCI-DSS | partial | Req 11.4 (intrusion-detection/IPS at network perimeter) and Req 12.10 (incident response) both consume threat-intel feeds; PCI is not the primary buyer of TI but TI is the substrate that satisfies these reqs. |
| GDPR | partial | Article 32 security-of-processing requires "appropriate technical measures" against threats; threat-intel-based blocking is an accepted technical measure. CTI itself processes external-actor data (IPs, domains) which may or may not be personal data under GDPR (mostly not, but adversary attribution touches on it). |
| CISA-AIS-AUTOMATION-ACT | direct | Cybersecurity Information Sharing Act (2015) and CISA Automated Indicator Sharing program govern US public/private CTI sharing. TI programs serving US critical-infrastructure orgs operate under these rules; sector ISACs (FS-ISAC, H-ISAC, E-ISAC) implement at the sector level. |

(Each regulation candidate would need to be confirmed as a row in the `regulations` master before linking via `domain_regulations`. CISA-AIS likely needs a new `regulations` row; PCI-DSS and GDPR almost certainly exist already.)

#### Vendor-research basis (Phase 0 candidates)

The vendor surface walked above is from my own knowledge of the market, not a formal Phase 0 document. The headline signal is that the **curation-vs-operationalization split** is correct (every flagship distinguishes the analyst-facing curation surface from the deploy-side operationalization surface in its product navigation), and the **finished-intelligence + PIR workflow** is a first-class shape at every flagship pure-play (Recorded Future, ThreatConnect, Anomali, Mandiant), missing only from endpoint-vendor TI shells (CrowdStrike, MS Defender TI).

### Cross-bucket dependencies

- **B1-T1 (M-band modules) and B1-T2 (capabilities) gate the cascade**. B1-T6 through B1-T12 are all downstream. Fix order: T2 (capabilities) and T1 (modules) can land in the same load with `domain_module_capabilities` populated immediately. Then T6 (masters + module attribution) -> T7 (lifecycle states with `domain_module_id` set) -> T11 (per-module system skills + skill_tools) -> T8 (intra-domain relationships) -> T9 (users edges) -> T10 (aliases) -> T12 (roles). T3 (catalog UX wording), T4 (em-dash sanitization), T5 (business_function_domains contributors), T13 (domain_aliases) can land in parallel with or before T1/T2.
- **B2-T1 (module split topology) gates B1-T1**. The chosen split determines capability-to-module attribution.
- **B2-T2 (catalog UX wording) gates B1-T3**. Rule #20 prohibits the agent writing these without user-approved text.
- **B2-T3 (lifecycle exemptions) gates B1-T7**. The exemption decision determines whether 2 or 6 masters carry state machines.
- **B2-T4 (cross-cutting capability promotion) gates B1-T2**. Decision shapes whether `TI-ENRICHMENT` ships domain-prefixed or domain-neutral, which affects how many `capability_domains` rows ship in this load.
- **B2-T5 (MITRE-ATTACK architecture) gates B1-T6**. The architecture decision shapes the `attack_techniques` master shape: row in `data_objects` (THREAT-INTEL masters) vs. dedicated reference domain vs. platform_builtin. If option (b) is picked, queue `SECURITY-FRAMEWORKS` (or `MITRE-FRAMEWORKS`) as a missing-domain candidate.
- **Bucket 3** is independent of Bucket 1: vendor research either vets the candidates (-> they become Bucket 1 items in a follow-up audit) or eyeball-mode promotes a subset. Either way, the modules in B1-T1 are designed to absorb the Bucket 3 entities without re-splitting.
- **H1 (APQC TAGGING)** is vacuous in this audit (zero cross-domain handoffs to tag). After B1-T6/T7 land and handoffs get authored, a follow-up audit will produce the APQC pass.

### Per-bucket prompts

**Bucket 1 - fix these now?** Reply with: `all`, or list (e.g. `T2, T3, T4`, or `T4 + T13 only` to fast-track the trivial sanitization and discoverability rows), or `skip`.

- **T1 (M1 - load 2 modules + capability-to-module mapping):** decide B2-T1 first.
- **T2 (A2 - 7-9 capability rows + `capability_domains` junctions):** decide B2-T4 first (cross-cutting promotion).
- **T3 (A4 - catalog_tagline + catalog_description PATCH):** gated on B2-T2 wording approval.
- **T4 (A1 - em-dash sanitization on business_logic):** trivial; no dependencies. Single PATCH.
- **T5 (C1 - business_function_domains contributors, 2-3 rows):** no dependencies.
- **T6 (B-band - master entity authoring, 7 masters + DMDO + Rule #9 naming arbitration):** gated on T1, B2-T1, B2-T3, B2-T5.
- **T7 (B12 - lifecycle states):** gated on T6 and B2-T3.
- **T8 (B6 - intra-domain relationships, 9-12 rows):** gated on T6.
- **T9 (B7 - users-edge relationships, 4-5 rows):** gated on T6.
- **T10 (B11 - data_object_aliases, 12-18 rows):** gated on T6.
- **T11 (F2/F3/F4/F7 - per-module system skills + skill_tools + abstraction-tool routing):** gated on T1, T6.
- **T12 (E1/E2/E3/E4 - 3-4 roles + role_modules + role_permissions):** gated on T1.
- **T13 (domain_aliases - 5-6 alias rows):** no dependencies; trivially loadable.

**Bucket 2 - what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-T1 (module split topology)**: a / b / c?
- **B2-T2 (catalog UX wording)**: a / b / c (or supply alternate wording)?
- **B2-T3 (lifecycle exemptions for `threat_actors`, `threat_campaigns`, `malware_families`, `attack_techniques`)**: a / b / c?
- **B2-T4 (cross-cutting capability promotion of `TI-ENRICHMENT` / `TI-COLLABORATION-SHARING`)**: a / b / c?
- **B2-T5 (`MITRE-ATTACK` reference architecture)**: a / b / c (option b queues a new domain candidate)?

**Bucket 3 - Phase 0 pending - vet via formal Phase 0 vendor research or eyeball-mode?**

- Vetted route: spawn a focused Phase 0 subagent walking the 8 entity candidates against Recorded Future, Anomali, ThreatConnect, Mandiant Advantage, Group-IB, Microsoft Defender TI schemas. Survivors return as Bucket 1 in a follow-up audit.
- Eyeball route: user names which of the 8 ring true; they become Bucket 1 items immediately. Strongest-signal candidates from my own pass: `indicator_sightings`, `tip_feeds`, `feed_subscriptions`, `indicator_blocklists`, `enrichment_records` (the operationalization quartet plus the curation enrichment layer every flagship masters). The remaining 3 (`intel_consumers`, `intel_collection_plans`, `tlp_classifications`) are softer signals.
- Regulation candidates (3): pick which to load via `domain_regulations`. CISA-AIS likely needs a new `regulations` row first.

### Report-only follow-ups (owed by other domains)

Because THREAT-INTEL has zero modules and zero cross-domain handoffs in the catalog today, there are no symmetric "owed-by-other-domain" findings to report. Once B1-T1/T6 land, the following pairwise reconciliations will become meaningful:

- **SECOPS B9 will owe outbound handoffs to THREAT-INTEL** once `indicator_sightings` is mastered: `service_incident.created` from SECOPS plausibly fires a TI-side lookup, and `service_incident.closed_as_security` may feed back to TI as a `closed_sighting` event. Surface for SECOPS audit.
- **VULN-MGMT B9 will owe outbound to THREAT-INTEL** once `cve_actively_exploited` becomes an event: `cve.exploit_observed_in_wild` reprioritizes vuln backlog. Bidirectional.
- **SOAR B8 will owe outbound `data_object_relationships`** from `automation_playbooks` to `threat_indicators` / `threat_actors` (playbooks reference TI primitives). Surface for SOAR audit.
- **DLP B8 / B9 will owe inbound handoffs from THREAT-INTEL** once `threat_indicator.published` is an event (DLP policy authoring consumes TI). Surface for DLP audit (DLP's 2026-05-30 audit already flagged this kind of inbound gap from its own side).
- **ITSM B9 will owe outbound** on `major_incident.declared` to THREAT-INTEL (incident bridge consumes finished-intelligence briefings).
- **CMDB B-band will owe** a sighting-feed for asset-level indicator matches (`asset.indicator_matched` event).
- **GRC B-band will owe** a finished-intelligence consumer DMDO row for intel briefings feeding the risk register.
- **IGA B-band will owe** an adversary-attributed-credential-leak handoff (`compromised_credentials.detected` event from TI to IGA).

None of these are blockers for THREAT-INTEL's pass once the M1/B-band foundation lands.

### Candidates queued

- **SIEM** (Security Information and Event Management) - Splunk Enterprise Security, Microsoft Sentinel, IBM QRadar, Securonix, Exabeam, Sumo Logic, Elastic Security, Chronicle (Google SecOps). Primary downstream consumer of TI indicators (push side) and primary upstream producer of sightings (telemetry side). Distinct from SECOPS (case-management) and SOAR (orchestration).
- **XDR** (Extended Detection and Response) - Palo Alto Cortex XDR, CrowdStrike Falcon Insight XDR, Microsoft Defender XDR, SentinelOne Singularity XDR, Trellix XDR, Trend Micro Vision One. Same producer/consumer relationship with TI as SIEM but with cross-surface telemetry correlation as the marquee capability.
- **DRP** (Digital Risk Protection) - ZeroFox, Digital Shadows (ReliaQuest), Recorded Future Brand Intelligence, Mandiant Digital Threat Monitoring, IntSights (Rapid7), CybelAngel. Distinct from THREAT-INTEL: external-attack-surface focus (brand impersonation, dark-web credential leaks, executive protection), where THREAT-INTEL focuses on the adversary/IOC/TTP substrate.
- **CAASM** (Cyber Asset Attack Surface Management) - Axonius, JupiterOne, Sevco, Noetic Cyber, runZero, Lansweeper Security. Already had 1 prior mention; this audit bumps to 2.

## 2026-05-31, Continuation: B1 technical fixes

### Summary

Subagent pass under leadership-tier technical-only license. Of 13 Bucket 1 findings, only **1 qualified for technical application** (B1-T4 em-dash sanitization on a named single row with pre-specified replacement text); the remaining 12 were deferred because they fall under the explicit "DEFER" categories in the technical-fix license (new entities/DMDOs/modules, catalog_tagline/description per Rule #20, new business_function_domains contributors/consumers, new domain_aliases, gated on user-pick options, gated on prerequisite loads).

### Fixes applied

| ID | Type | Action |
|---|---|---|
| B1-T4 | PATCH naming rename (single row, pre-specified text) | PATCH `/domains?id=eq.14` setting `business_logic` to remove the U+2014 em-dash. New value: `"Indicator correlation, enrichment pipelines, and adversary attribution: analytic substrate beneath a curation workflow."`. Single CLI call, no loader required. |

### Deferred (12) with reasons

| ID | Defer reason |
|---|---|
| B1-T1 | New `domain_modules` rows (DEFER: new modules). Also gated on B2-T1 user pick. |
| B1-T2 | New `capabilities` + `capability_domains` rows (DEFER: new entities). Also gated on B2-T4 user pick. |
| B1-T3 | `catalog_tagline` / `catalog_description` writes (DEFER: Rule #20). Gated on B2-T2 user-approved wording. |
| B1-T5 | New `business_function_domains` contributor rows (DEFER: explicit "new business_function_domains contributors/consumers" carve-out). |
| B1-T6 | New `data_objects` masters + `domain_module_data_objects` rows (DEFER: new entities/DMDOs). Gated on B2-T3, B2-T5 user picks. |
| B1-T7 | New `data_object_lifecycle_states` rows (DEFER: gated on T6 and B2-T3). |
| B1-T8 | New intra-domain `data_object_relationships` rows (DEFER: gated on T6; not audit-pre-specified user-edges under Rule #10). |
| B1-T9 | New `users`-edge `data_object_relationships` rows (DEFER: gated on T6; audit does not pre-specify the tuples in Rule #10 land-now shape). |
| B1-T10 | New `data_object_aliases` rows (DEFER: not pre-specified exact tuples; gated on T6 masters). |
| B1-T11 | New `skills` + `tools` + `skill_tools` rows (DEFER: gated on T1 modules; new entities). |
| B1-T12 | New `roles` + `role_modules` + `role_permissions` rows (DEFER: gated on T1; new entities). |
| B1-T13 | New `domain_aliases` rows (DEFER: explicit "new `domain_aliases`" carve-out). |

### JWT errors

None.

### Notes

- Description column on `domains.id=14` retains `"operationalisation"` (British spelling, against CLAUDE.md American-English rule). Not in this audit's pre-specified PATCH scope; surfaced here for the next pass to consider.
- No loader script was created (the single PATCH was inline via the CLI).

## 2026-05-31, Audit

### Summary

Fresh structural Validate b1 pass run against live state. Findings are essentially the same shape as 2026-05-30 with one resolution carried over from the 2026-05-31 technical continuation (B1-T4 em-dash sanitization on `domains.id=14.business_logic` is now clean). Catalog state for THREAT-INTEL remains foundationally empty: zero modules (M1 hard fail), zero capabilities (A2 hard fail), zero masters, zero handoffs (in either direction), zero regulations, zero `data_object_lifecycle_states`, zero `data_object_relationships`, zero `data_object_aliases`, zero skills, zero roles, zero `domain_aliases`. `business_function_domains` carries 1 `owner` row (Security Operations Center) with no contributors or consumers. `catalog_tagline` and `catalog_description` on `domains.id=14` remain empty (A4 fail). `domains.id=14.description` retains the British spelling `"operationalisation"` (A1 sanitization candidate, carried from prior audit). 5 `solution_domains` rows linked (Recorded Future, Anomali, ThreatConnect, ServiceNow Threat Intelligence as primary; Palo Alto Cortex XSOAR as secondary). Domain remains on the leadership-tier exception list for B1's master-floor; M1's module-floor still applies. The dominant block remains B2-T1 module-split topology (user judgment) gating B1-T1 / B1-T6 and the entire B/E/F cascade.

- Current footprint: 5 `solution_domains` + 1 `business_function_domains` (owner) + 1 `domains` row. Zero everything else.
- Bucket 1 (in-scope, agent fixable): 12 items (1 unchanged from prior audit; B1-T4 resolved on 2026-05-31).
- Bucket 2 (surface-for-user, judgment): 5 items (unchanged).
- Bucket 3 (Phase 0 pending, speculative): 12 items (unchanged: 8 missing entities + 1 modularization proposal + 3 regulation candidates).
- Candidates queued: 4 (SIEM, XDR, DRP, CAASM, all queued in prior audit).
- Status: `feedback_needed`.
- `next_action_by`: `user` (Bucket 1 is fully gated on Bucket 2 user picks for the module-split + masters cascade; the remaining unblocked Bucket 1 rows are user-pick-gated too via Rule #20 for B1-T3 and the explicit-carve-out rules for B1-T5 / B1-T13).

### Vendor surface basis

Carried from 2026-05-30 audit: Recorded Future, Anomali, ThreatConnect, Mandiant Advantage, Microsoft Defender TI, CrowdStrike Falcon Intelligence, IBM X-Force, Group-IB, ServiceNow Threat Intelligence (workflow shell), Palo Alto Cortex XSOAR Threat Intelligence Management. Specialist pure-plays: Recorded Future, Anomali, ThreatConnect, Group-IB. Endpoint-vendor TI shells: CrowdStrike, Microsoft Defender TI. Workflow-aggregator shells: ServiceNow, XSOAR. Catalog has 5 of 10 enumerated (the 4 primary plus the 1 secondary above). Missing from `solutions`: Mandiant Advantage, Microsoft Defender TI, CrowdStrike Falcon Intelligence, IBM X-Force, Group-IB. The surface basis is from analyst knowledge, not a formal Phase 0 document.

### Neighbor discovery (auto-derived from handoffs + DMDO; ranked by edge weight)

Vacuous: THREAT-INTEL has zero `handoffs` and zero `domain_module_data_objects` rows. No neighbor edge weights are computable from live state. The implied neighbor set carries from the prior audit (parent SECOPS; siblings SOAR, VULN-MGMT; market-adjacent ITSM, CMDB, IGA, DLP, GRC, DSPM). These become real once B1-T1 / B1-T6 land. Pairwise reconciliation cannot find anything to diff against; foundation has to land first.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (A / M / C / B / F / E)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-T1 | **M1 (hard fail), BLOCKING** | `/domain_modules?domain_id=eq.14` returns zero rows. Rule #14 floor is >=1 `module_kind='full'` row for every `domains` row; M2 will additionally require >=2 once A2 lands >=3 capabilities. Proposed split per B2-T1: `THREAT-INTEL-CURATION` (analytic substrate: indicators, actors, campaigns, malware, techniques, reports, requirements) + `THREAT-INTEL-OPERATIONALIZATION` (sightings, blocklists, feeds, subscriptions, consumers). | Phase A load gated on B2-T1 user pick: 2 `domain_modules` rows + `domain_module_capabilities` after T2 + `domain_module_data_objects` after T6. Per Rule #20 the per-module `catalog_tagline` / `catalog_description` are drafted in buyer voice and surfaced to user before write (M8 is the per-module rollup of A4). |
| B1-T2 | **A2 (hard fail), BLOCKING** | `/capability_domains?domain_id=eq.14` returns zero rows. Vendor surface supports 7-9 capabilities: `TI-INDICATOR-LIFECYCLE`, `TI-ADVERSARY-TRACKING`, `TI-CAMPAIGN-ANALYTICS`, `TI-FEED-MGMT`, `TI-FINISHED-INTELLIGENCE`, `TI-INTEL-REQUIREMENTS`, `TI-ENRICHMENT`, `TI-OPERATIONALIZATION`, `TI-COLLABORATION-SHARING`. `TI-ENRICHMENT` and `TI-COLLABORATION-SHARING` are cross-cutting candidates (B2-T4). | Phase A capability load + `capability_domains` junctions, gated on B2-T4 user pick (domain-prefixed vs cross-cutting promotion). |
| B1-T3 | **A4 (hard fail)** | `catalog_tagline` and `catalog_description` on `domains.id=14` are both empty strings. Per Rule #20 buyer-voice drafts go to user for approval before write. | Surface user-approved wording in Bucket 2 (B2-T2). Load via PATCH after approval. |
| B1-T4 | **(RESOLVED 2026-05-31)** | Previously: U+2014 em-dash in `domains.id=14.business_logic`. Resolved in 2026-05-31 continuation: `business_logic` now reads `"Indicator correlation, enrichment pipelines, and adversary attribution: analytic substrate beneath a curation workflow."`. | No action this pass. |
| B1-T5 | **C1 (soft)** | `/business_function_domains?domain_id=eq.14` returns 1 `owner` row (Security Operations Center). Zero `contributor` / `consumer` rows. TI is consumed by SOC analysts (already covered via owner), vulnerability managers, incident responders, threat hunters, fraud teams (FSI orgs), executive leadership (finished-intelligence briefings). Expected: 2-3 contributor / consumer rows. | Load contributor / consumer rows: `Information Security` (contributor for indicator-blocking ops), `Risk and Compliance` (consumer for finished-intelligence and risk-register feed). |
| B1-T6 | **B-band foundation (hard fail given leadership exception's narrow scope)**, MASTER ENTITY AUTHORING | Leadership-tier B1 exemption applies only to truly-no-masters domains (REV-INTEL, SALES-PERF, FINOPS, etc.). THREAT-INTEL is an analytic market with rich substrate; the vendor surface unambiguously identifies 5-7 entities every flagship masters. Proposed masters (apply Rule #9 naming arbitration): `threat_indicators`, `threat_actors`, `threat_campaigns`, `malware_families`, `attack_techniques` (config-shaped reference master; see B2-T5), `intelligence_reports` (`has_submit_lock=true` at `published`), `intel_requirements`. | Phase B load after B1-T1 / B1-T2: 7 `data_objects` rows + `domain_module_data_objects` rows mapping each to CURATION vs OPERATIONALIZATION. Lifecycle states per B1-T7. Gated on B2-T1, B2-T3, B2-T5. |
| B1-T7 | **B12 (gated on T6)** | Zero `data_object_lifecycle_states`. Expected once T6 lands: `threat_indicators` (ingested -> deduplicated -> enriched -> scored -> active -> expired or retracted) with gate at `active` and `retracted`; `intelligence_reports` (draft -> in_review -> approved -> published -> archived) with submit_lock at `published`; `intel_requirements` (proposed -> approved -> active -> retired) with single-approver. `threat_actors`, `threat_campaigns`, `malware_families`, `attack_techniques` are config-shape candidates (B2-T3). | Draft state machines per master once T6 lands; workflow-gate permissions materialize via per-module derivation rule. |
| B1-T8 | **B6 (gated on T6), intra-domain relationships** | Zero `data_object_relationships`. Once T6 lands, expected 9-12 edges: `threat_indicators attributed_to threat_actors`; `threat_indicators part_of threat_campaigns`; `threat_actors uses attack_techniques`; `threat_actors uses malware_families`; `threat_campaigns staged_by threat_actors`; `malware_families implements attack_techniques`; `intelligence_reports analyzes threat_actors`; `intelligence_reports cites threat_indicators`; `intel_requirements scopes threat_actors`. | Draft and load once T6 lands via cluster-drafts pattern. |
| B1-T9 | **B7 (gated on T6), users-edge relationships** | Zero `users`-edge rows. Once T6 lands, expected 4-5 edges per Rule #10: `users authors intelligence_reports`; `users reviews intelligence_reports`; `users approves intel_requirements`; `users curates threat_indicators`; `users attributes threat_actors`. | Load once T6 lands. |
| B1-T10 | **B11 (gated on T6), aliases** | Zero `data_object_aliases`. Vendor terminology drift is heavy: `threat_indicators <-> IOCs <-> observables (STIX 2.x) <-> sightings (when matched)`; `threat_actors <-> adversaries <-> intrusion sets (STIX) <-> APTs`; `threat_campaigns <-> operations <-> intrusion campaigns`; `attack_techniques <-> TTPs <-> MITRE ATT&CK techniques`; `intelligence_reports <-> finished intelligence <-> intel briefings <-> STIX reports`. | Draft 12-18 alias rows once T6 lands. |
| B1-T11 | **F2/F3/F4/F7 (gated on T1)**, SYSTEM SKILLS | Zero skills, zero tools, zero `skill_tools`. Per Rule #17 each module gets exactly one `skill_type='system'` skill with >=1 `skill_tools` row. Once two modules exist: `threat_intel_curation_agent` (CURATION) with `query_threat_indicators`, `query_threat_actors`, `create_intelligence_report`, `update_intelligence_report_status`, `enrich_indicator` (side_effect), `notify_person` (analyst peer-review); `threat_intel_operationalization_agent` (OPERATIONALIZATION) with `query_indicator_sightings`, `query_indicator_blocklists`, `push_indicator_to_blocklist` (side_effect to SIEM / firewall / EDR), `receive_sighting_telemetry` (inbound), `notify_team` (broadcast on high-confidence match). F4: `query` / `mutate` set `data_object_id`; `side_effect` / `compute` NULL; `inbound` optional. F7: default to `notify_person` / `notify_team` over channel primitives. | Phase-S load alongside module load. |
| B1-T12 | **E1/E2/E3/E4 (gated on T1)**, ROLES | Zero roles. Once 2 modules exist E1 mandates >=3 distinct roles. Expected: `INFORMATION-SECURITY-THREAT-INTEL-ANALYST` (function-scoped to `Information Security`, primary CURATION, secondary OPERATIONALIZATION); `INFORMATION-SECURITY-THREAT-HUNTER` (primary OPERATIONALIZATION, secondary CURATION); `INFORMATION-SECURITY-CTI-MANAGER` (manager-tier cross-functional, primary on both); optionally `SECURITY-OPERATIONS-INCIDENT-RESPONDER` as cross-domain consumer with `interaction_level='secondary'` on OPERATIONALIZATION. | Author after T1; function-scoped naming; explicit `interaction_level` per E3. |
| B1-T13 | **Discoverability, domain_aliases** | Zero `domain_aliases`. Per Rule #20 feeds catalog search and per-domain skill trigger phrases. Expected: `CTI`, `TIP`, `threat intel`, `cyber threat intelligence`, `IOC management`, `indicator management`. | Load 5-6 alias rows. No dependencies. |
| B1-T14 | **A1 sanitization (soft)** | `domains.id=14.description` carries the British spelling `"operationalisation"` ("Collection, curation, and operationalisation of indicators and adversary intelligence."), against the American-English rule in CLAUDE.md. Carried from prior audit's Notes; not yet in PATCH scope. | Single-row PATCH replacing `operationalisation` with `operationalization`. No dependencies. |

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1, A2, A4, A1 description, C1, B6, B7, B11, B12, F2/3/4/7, E1/2/3/4) | 11 |
| DISCOVERABILITY (`domain_aliases`) | 1 |
| APQC TAGGING | 0 (vacuous: zero cross-domain handoffs) |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 in Bucket 1 (vacuous: zero catalog footprint) |
| **Bucket 1 total** | **12** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-T1 | **Module split topology** gating B1-T1. CURATION + OPERATIONALIZATION (recommended; mirrors Recorded Future, ThreatConnect product nav) vs four lifecycle-stage modules (collection, processing, analysis, dissemination; analyst-textbook canonical) vs single THREAT-INTEL-PLATFORM + a THREAT-INTEL-LITE starter (Rule #19). | Modularization decision with downstream effects on capability assignment, master attribution, role bundles, Phase-S shape. | (a) CURATION + OPERATIONALIZATION (recommended); (b) four lifecycle-stage modules; (c) single module + starter. |
| B2-T2 | **Catalog UX wording draft** gating B1-T3. Drafts (Rule #20 forbids agent writing these without user approval): `catalog_tagline = "Aggregate threat indicators and adversary intelligence from open and commercial feeds, then push curated signals into your detection stack."`. `catalog_description` (2 paragraphs): para 1 covers pulling indicators (hashes, IPs, domains, URLs, CVEs) from open feeds, commercial providers, ISAC communities; normalizing across STIX / TAXII, MISP, vendor formats; deduplicating; scoring by confidence; tracking actors, campaigns, malware families with TTPs mapped to MITRE ATT&CK; authoring finished-intelligence reports for stakeholders. Para 2 covers pushing high-confidence indicators into SIEM, EDR, firewall, DNS sinkholes; tracking sightings when telemetry matches; managing PIRs; sharing back to the community in TLP-aware formats. | Marketing voice and buyer-vs-analyst calibration are user-owned. | (a) Approve drafts as-is; (b) Edit and approve; (c) Defer A4 to separate marketing-voice review pass. |
| B2-T3 | **Lifecycle-state exemptions** for `threat_actors`, `threat_campaigns`, `malware_families`, `attack_techniques`. First three are append-rare-edit registries; `attack_techniques` is effectively MITRE ATT&CK FK (config-shape; tied to B2-T5 architecture choice). Per Rule #15 the exemption decision lives in this audit, not in `data_objects.notes`. | Workflow-bearing vs config-shape is a substantive call. Vendor practice varies (Anomali workflow-shapes actors; Recorded Future registry-shapes them). | (a) Exempt all four as config-shape; (b) Workflow on `threat_actors` only (draft -> peer_reviewed -> published -> archived); (c) Workflow on `threat_actors` plus `intelligence_reports` (already in Bucket 1), config-shape the rest. |
| B2-T4 | **Cross-cutting capability promotion** for `TI-ENRICHMENT` and `TI-COLLABORATION-SHARING`. Recorded Future, VirusTotal Premium, Anomali Lens, Mandiant Advantage all sell enrichment APIs hit from SOAR, DLP, VULN-MGMT contexts. ISAC sharing is a workflow surface, less clearly a vendor market. | Cross-cutting promotion has downstream effects on Phase-A loader shape and which `capability_domains` rows ship in this load. | (a) Author both as domain-prefixed (lowest authoring cost); (b) Promote `TI-ENRICHMENT` to domain-neutral `THREAT-ENRICHMENT` linking THREAT-INTEL, SOAR, DLP, VULN-MGMT; (c) Promote both. |
| B2-T5 | **`MITRE-ATTACK` reference master architecture** gating B1-T6. MITRE ATT&CK techniques are a public reference framework with stable IDs (T1059, T1486, etc.). Three architectural options. | Cross-domain master architecture is a design call with deploy-time effects. | (a) THREAT-INTEL masters `attack_techniques`; cross-domain consumers `consumer + embedded_master`; (b) Promote a `SECURITY-FRAMEWORKS` master domain (queue as missing-domain candidate); (c) `attack_techniques` as `kind='platform_builtin'` (heaviest precedent, extends seed-list semantics). |

### Bucket 3, Phase 0 pending (speculative; vendor knowledge basis)

The THREAT-INTEL substrate is empty; Bucket 3 lists vendor-knowledge candidates that should be vetted via a formal Phase 0 pass before landing in Bucket 1.

#### MISSING (8), proposed module assignment

| Entity | Proposed module | Vendor evidence |
|---|---|---|
| `indicator_sightings` | THREAT-INTEL-OPERATIONALIZATION | Recorded Future Sightings, ThreatConnect Observations, Anomali Sightings, Mandiant Indicator Matches. First-class telemetry-hit record. |
| `tip_feeds` | THREAT-INTEL-OPERATIONALIZATION | Anomali Feeds, ThreatConnect Sources, Recorded Future Source Catalog. Config-shape feed registry. |
| `feed_subscriptions` | THREAT-INTEL-OPERATIONALIZATION | Per-tenant subscription state per feed (active, paused, throttled, errored). Distinct from feed master. |
| `indicator_blocklists` | THREAT-INTEL-OPERATIONALIZATION | Push-side artifact: indicators provisioned to a downstream control (SIEM allow/deny, firewall, EDR custom IOC). Tracks expiration, false-positive retraction, push targets. |
| `enrichment_records` | THREAT-INTEL-CURATION | Per-indicator enrichment outputs (passive DNS, WHOIS, geolocation, sandbox detonation). One per (indicator x enrichment source). ThreatConnect Enrichments, Recorded Future Intelligence Cards. |
| `intel_consumers` | THREAT-INTEL-OPERATIONALIZATION | First-class downstream consumer record (SOC team, IR team, fraud team, executive briefing audience). Drives dissemination workflows and report routing. |
| `intel_collection_plans` | THREAT-INTEL-CURATION | Collection plans tied to PIRs: which sources to query, what coverage gaps to address. Group-IB and Mandiant Advantage model this explicitly. |
| `tlp_classifications` | THREAT-INTEL-CURATION (config-shape) | Traffic-Light-Protocol classification registry (TLP:RED, TLP:AMBER, TLP:GREEN, TLP:CLEAR). Drives sharing-controls behavior. |

#### MODULARIZATION (1)

2-module split (`THREAT-INTEL-CURATION` + `THREAT-INTEL-OPERATIONALIZATION`) is the recommended baseline per B2-T1, mirroring Recorded Future, ThreatConnect, Mandiant Advantage product navigation. With 7-9 capabilities (B1-T2) Rule #14's 2-module floor is met with headroom. Lifecycle-stage 4-module split and single-module + starter shapes are the alternatives the user may pick under B2-T1.

#### REGULATION CANDIDATES (3)

Zero `domain_regulations` rows today. CTI sits beneath:

| Regulation candidate | applicability | Why |
|---|---|---|
| PCI-DSS | partial | Req 11.4 (intrusion detection / IPS) and Req 12.10 (incident response) consume threat-intel feeds. |
| GDPR | partial | Article 32 security-of-processing requires appropriate technical measures; threat-intel-based blocking qualifies. CTI processes external-actor data (IPs, domains), mostly not personal data, adversary attribution touches on it. |
| CISA-AIS-AUTOMATION-ACT | direct | Cybersecurity Information Sharing Act (2015) and CISA Automated Indicator Sharing program govern US public/private CTI sharing. TI programs at US critical-infra orgs operate under these rules; sector ISACs (FS-ISAC, H-ISAC, E-ISAC) implement. CISA-AIS likely needs a new `regulations` row before linking. |

### Cross-bucket dependencies

- B2-T1 (module split) gates B1-T1 and (via capability-to-module attribution) shapes B1-T2.
- B2-T2 (catalog UX wording) gates B1-T3 per Rule #20.
- B2-T3 (lifecycle exemptions) gates B1-T7.
- B2-T4 (cross-cutting capability promotion) gates B1-T2.
- B2-T5 (MITRE-ATTACK architecture) gates B1-T6 (specifically the `attack_techniques` master shape).
- B1-T6 (master authoring) gates B1-T7 / T8 / T9 / T10 / T11 / T12 (the whole B / F / E cascade).
- B1-T1 (modules) gates B1-T11 (system skills) and B1-T12 (roles).
- B1-T4 (em-dash sanitization) is **resolved** (no action).
- B1-T5 (BF contributors / consumers), B1-T13 (`domain_aliases`), B1-T14 (description spelling fix) have no dependencies but fall under explicit "DEFER" carve-outs in the leadership-tier technical-fix license (new `business_function_domains` contributors / consumers, new `domain_aliases`, new content); they require user approval before writing.
- Bucket 3 is independent of Bucket 1 (vendor research either vets candidates -> Bucket 1 in a follow-up, or eyeball-mode promotes a subset).
- H1 (APQC TAGGING) vacuous: zero cross-domain handoffs. After B1-T6 / T7 land and handoffs are authored, a follow-up audit will produce the APQC pass.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `T14`, `T5 + T13 + T14` to fast-track the three trivial / unblocked rows), or `skip`. The Bucket 1 cascade is heavily gated on Bucket 2 user picks (B2-T1 -> T1 -> T11 / T12; B2-T2 -> T3; B2-T3 / B2-T5 -> T6 -> T7 / T8 / T9 / T10); the only items the agent can land **immediately** under the standard technical-fix license are: B1-T14 (single-row PATCH replacing "operationalisation" with "operationalization") and (with user-approved exact text per Rule #15 for any `notes` and per Rule #20 for catalog UX) B1-T3 catalog UX writes. B1-T5 (new contributor / consumer BF rows) and B1-T13 (new domain_aliases rows) are explicit "DEFER" carve-outs and require explicit user approval per row.

**Bucket 2, what's your call on each?** Reply per item:

- **B2-T1** (module split topology): a / b / c?
- **B2-T2** (catalog UX wording): a / b / c (or supply alternate wording)?
- **B2-T3** (lifecycle exemptions for `threat_actors`, `threat_campaigns`, `malware_families`, `attack_techniques`): a / b / c?
- **B2-T4** (cross-cutting capability promotion of `TI-ENRICHMENT` / `TI-COLLABORATION-SHARING`): a / b / c?
- **B2-T5** (`MITRE-ATTACK` reference architecture): a / b / c (option b queues a `SECURITY-FRAMEWORKS` missing-domain candidate)?

**Bucket 3, Phase 0 vetted route or eyeball-mode?** Vetted: spawn a focused Phase 0 subagent walking the 8 entity candidates against Recorded Future, Anomali, ThreatConnect, Mandiant, Group-IB, MS Defender TI schemas; survivors return as Bucket 1 in a follow-up audit. Eyeball: name which candidates ring true; named candidates become Bucket 1 immediately. Strongest-signal candidates from prior pass: `indicator_sightings`, `tip_feeds`, `feed_subscriptions`, `indicator_blocklists`, `enrichment_records` (the operationalization quartet plus enrichment). Softer signals: `intel_consumers`, `intel_collection_plans`, `tlp_classifications`. Regulation candidates (3): pick which to load via `domain_regulations`; CISA-AIS likely needs a new `regulations` row first.

### Report-only follow-ups (owed by other domains)

Vacuous on the symmetric side: zero modules, zero cross-domain handoffs in either direction. Once B1-T1 / B1-T6 land the pairwise reconciliations carry over from the prior audit (SECOPS B9 owes outbound; VULN-MGMT B9 owes outbound; SOAR B8 owes `automation_playbooks` relationships to TI primitives; DLP B8 / B9 inbound on `threat_indicator.published`; ITSM B9 outbound on `major_incident.declared`; CMDB inbound `asset.indicator_matched`; GRC inbound finished-intelligence consumer; IGA inbound `compromised_credentials.detected`).

### Candidates queued

- **SIEM** (Security Information and Event Management): Splunk Enterprise Security, Microsoft Sentinel, IBM QRadar, Securonix, Exabeam, Sumo Logic, Elastic Security, Chronicle (Google SecOps). Primary downstream consumer of TI indicators (push side) and primary upstream producer of sightings (telemetry side).
- **XDR** (Extended Detection and Response): Palo Alto Cortex XDR, CrowdStrike Falcon Insight XDR, Microsoft Defender XDR, SentinelOne Singularity XDR, Trellix XDR, Trend Micro Vision One.
- **DRP** (Digital Risk Protection): ZeroFox, Digital Shadows (ReliaQuest), Recorded Future Brand Intelligence, Mandiant Digital Threat Monitoring, IntSights (Rapid7), CybelAngel. External-attack-surface focus; distinct from THREAT-INTEL.
- **CAASM** (Cyber Asset Attack Surface Management): Axonius, JupiterOne, Sevco, Noetic Cyber, runZero, Lansweeper Security.

### JWT errors

None.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass over the open items in audits/THREAT-INTEL/state.yaml; no fresh
from-scratch audit. Live confirmed THREAT-INTEL (domain_id=14, sub-domain under SECOPS id 11)
is still UNBUILT: 0 domain_modules (M1 fail), 0 capability_domains (A2 fail), 0 masters of its
own, 0 DMDOs, 0 skills, 0 roles, 0 handoffs. Per the UNBUILT rule the build and its whole
B/F/E cascade are SURFACED, not scaffolded. Two build-independent EXECUTE-class items were
applied (catalog UX, C1 contributor/consumer). Everything else is gated on the user's b2
module-split decision and the dependent picks, so next_action_by flips to `user`.

### Executed (counts)

- **Catalog UX (A4, Rule #20, B1B-T3 / B2-T2): 1 domain row.** Authored buyer-voice
  `catalog_tagline` + `catalog_description` into the EMPTY fields on domains.id=14
  (record_status='new'). Buyer voice, workflow + value, no vendor/product names, no em-dash,
  American English ("normalize"). The prompt's EXECUTE rule overrode the stale Rule #20
  surface-before-write gate (B2-T2). No non-empty value was overwritten. No modules exist, so
  there was no module-level catalog UX to write.
- **C1 business_function_domains (B1B-T5): 2 rows.** Inserted Security (fn 28) as
  `contributor` and Governance, Risk and Compliance (fn 31) as `consumer`, both
  record_status='new'. The existing owner row (Security Operations Center fn 64) was left
  untouched. Idempotent against (domain_id, business_function_id).

Loader: `.tmp_deploy/2026-06-07_threat_intel_state_driven_execute.ts` (bun run, idempotent).

### Surfaced (not written)

- **B1A-T14 (DESTRUCTIVE overwrite):** domains.id=14.description still reads British
  "operationalisation". Fix is a single-row overwrite of a NON-EMPTY value -> destructive,
  surfaced for approval. Recommended PATCH: description ->
  "Collection, curation, and operationalization of indicators and adversary intelligence."
  (business_logic was already cleaned in a prior pass; only description remains.)
- **B2-T1 (module split topology):** (a) CURATION + OPERATIONALIZATION [recommended] vs
  (b) four lifecycle-stage modules vs (c) single PLATFORM + LITE starter. Gates the whole build.
- **B2-T2 (catalog UX wording):** approve the copy written 2026-06-07 as-is, or supply edits
  (an edit is a non-empty overwrite, so it needs your text).
- **B2-T3 (lifecycle exemptions):** workflow vs config-shape for threat_actors,
  threat_campaigns, malware_families, attack_techniques.
- **B2-T4 (cross-cutting capability promotion):** TI-ENRICHMENT / TI-COLLABORATION-SHARING
  domain-prefixed vs promoted domain-neutral.
- **B2-T5 (MITRE-ATTACK master architecture):** THREAT-INTEL masters attack_techniques vs a
  promoted SECURITY-FRAMEWORKS master domain vs platform_builtin.
- **Personas / RACI (Phase P): DEFERRED.** Domain is pre-build; not authored. Candidate
  personas once built: CTI analyst, threat hunter, CTI manager, incident-responder consumer.

### Left

- **Build cascade (B1A-BUILD + B1B-T1/T2/T6/T7/T8/T9/T10/T12):** SURFACED, not scaffolded
  per the UNBUILT rule; all gated on B2-T1 and the dependent b2 picks. T10
  (data_object_aliases) additionally has nothing to anchor to until T6 masters land.
- **B1B-T13 (domain_aliases):** agent-DEFER carve-out (needs per-row user approval), not in
  the EXECUTE bucket; left.
- **Former B1B-T11 (per-module system skills + skill_tools):** RETIRED by the 2026-06-06
  supersession; folded into the B1A-BUILD Phase-S step (one domain-grain system skill).
- **b3 (12 candidates):** backlog (indicator_sightings, tip_feeds, feed_subscriptions,
  indicator_blocklists, enrichment_records, intel_consumers, intel_collection_plans,
  tlp_classifications, the 2-module split proposal, 3 regulation candidates). Untouched.

### JWT errors

None.
