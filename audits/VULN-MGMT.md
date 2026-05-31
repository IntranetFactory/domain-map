---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 17
---

# VULN-MGMT, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 modules** (no `domain_modules` row, no `domain_module_host_domains` row). **0 capabilities** (no `capability_domains` rows). **0 masters** — VULN-MGMT sits in the leadership-tier exception list (SKILL.md B1) so a zero-master state passes B1 by exception, but the absence of any module also defeats Rule #14's positive-existence floor. **2 non-master DDO rows**: `software_installations` (id 59, role `consumer`, necessity `required`, canonically mastered by SAM at module SAM-INST-MGMT) and `org_units` (id 34, role `embedded_master`, necessity `optional`, canonically mastered by HCM at module HCM-ORG-POSITIONS). **5 solutions** linked at `coverage_level=primary` (ServiceNow Vulnerability Response, Tenable One, Qualys VMDR, Rapid7 InsightVM, Wiz Cloud Security Platform). **7 mandatory `domain_regulations`** (ISO/IEC 27001, SOC 2, NIST CSF, NIS2, DORA, NERC CIP, CMMC). **3 `business_function_domains`** (Security Operations Center as owner; IT Operations and Software Engineering as contributors). **1 inbound cross-domain handoff** (36, SAM, VULN-MGMT, trigger 122 `software_install.detected`, payload `software_installations`, integration_pattern `event_stream`, friction `low`, both module FKs NULL). **0 outbound handoffs**. **0 intra-domain handoffs** (no modules). **0 `trigger_events`** rooted on VULN-MGMT-mastered data_objects (because there are none). **0 `data_object_aliases`**. **0 `domain_aliases`**. **0 system skills**, **0 `skill_tools`**, **0 `role_modules`**. **Empty `catalog_tagline` and `catalog_description`** (A4 fail). **Description carries an em-dash byte** ("applications.") that violates the project's no-em-dash rule on catalog text. **Semantius score: uncomputable** (no skills, no modules).
- **Vendor-surface basis (Pass 2 flagship enumeration):** Tenable One (Tenable Nessus, Tenable.io, Tenable Vulnerability Management, Tenable Web App Scanning, Tenable Cloud Security), Qualys VMDR (Qualys Cloud Platform, VMDR TruRisk, Patch Management, Container Security), Rapid7 InsightVM (and InsightAppSec for web, InsightCloudSec posture), Wiz Cloud Security Platform (vulnerability prioritisation arm), ServiceNow Vulnerability Response (consumer of scanner output, drives the ticketing workflow), Microsoft Defender Vulnerability Management, CrowdStrike Falcon Spotlight, Ivanti Neurons for Vulnerability Knowledge Based Authentication, Vicarius vRx, Action1, Greenbone OpenVAS / Greenbone Enterprise, Nucleus Security (consolidation and orchestration of multi-scanner output), Vulcan Cyber, Brinqa (risk-based vulnerability management orchestration). Compliance-specialist coverage anchored on PCI-DSS 4.0 requirement 11.3 (vulnerability scanning quarterly + on change), HIPAA Security Rule §164.308(a)(1)(ii)(A) (risk analysis), SOX 404 IT general controls (patch and vulnerability remediation evidence), FedRAMP / NIST 800-53 control family RA-5 (vulnerability scanning) and SI-2 (flaw remediation), GDPR Article 32 (security of processing), NIS2 Article 21 obligations on essential / important entities.
- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.
- **Candidate-domain queue:** 4 new candidates appended to `audits/_missing-domains.md` (EASM, PTAAS, CTEM, VULN-INTEL). CSPM, CIEM, CAASM, PATCH-MGMT, EDR, PAM were already queued by prior audits; this audit bumped no counters on those because they were already in the queue and the helper only mention-counts re-runs on the same code.

**Neighbor discovery (auto-derived from handoffs + cross-domain DDO ownership, ranked by edge weight):**

| Neighbor | Out | In | Cross-rels | DDO overlap | Weight | Pass shape |
|---|---|---|---|---|---|---|
| SAM | 0 | 1 (36) | 0 | VULN-MGMT consumer of SAM-mastered `software_installations` | 2 | Pairwise (full) |
| HCM | 0 | 0 | 0 | VULN-MGMT embeds HCM-mastered `org_units` shell (optional) | 1 | Lightweight |
| SECOPS (parent) | 0 | 0 | 0 | Leadership-tier parent; VULN-MGMT is a SECOPS sibling alongside SOAR + THREAT-INTEL | 0 | Lightweight |
| CMDB | 0 | 0 | 0 | No edges loaded. Expected substrate dependency (CMDB owns `configuration_items`, `software_installations` cross-walks); a real VULN-MGMT load would consume `configuration_items` from CMDB and emit findings against them. | 0 (catalog) / high (expected) | Lightweight |
| ITSM | 0 | 0 | 0 | No edges loaded. Expected substrate dependency (VULN-MGMT findings open `incidents` and / or `change_requests` for remediation routing). | 0 (catalog) / high (expected) | Lightweight |
| SOAR | 0 | 0 | 0 | Sibling under SECOPS. Expected outbound: vulnerability-finding events feed SOAR playbooks. | 0 | Lightweight |
| THREAT-INTEL | 0 | 0 | 0 | Sibling under SECOPS. Expected inbound: CISA KEV, EPSS, exploit-in-the-wild enrichment. | 0 | Lightweight |

**Structural pass bands (results, blocking failures first):**

- **M1 hard-fail (Rule #14).** VULN-MGMT has **zero** `domain_modules` rows of any `module_kind` and **zero** `domain_module_host_domains` rows. Rule #14's floor (>=1 `module_kind='full'` row regardless of leadership-tier status) is unmet. Every downstream module-keyed band (M2-M7, B5-B12 module attribution, C2, D, E, F) is uncomputable until M1 is fixed. **The leadership-tier exception in B1 (zero masters allowed) does NOT extend to M1 (zero modules)** — Rule #14 is unconditional. The intended shape for leadership-tier domains is a "derived-signals" / "landing" module with possibly-empty `domain_module_data_objects`. VULN-MGMT is NOT genuinely leadership-tier in the SOAR / THREAT-INTEL sense though: flagship vendors (Tenable One, Qualys VMDR, Rapid7 InsightVM, Wiz, ServiceNow VR) all master substantial workflow entities (scan jobs, findings / vulnerabilities, asset-vulnerability instances, remediation tickets). The leadership-tier inclusion in the SKILL.md B1 list appears to be a hold-over from an early classification pass and warrants re-evaluation, see B2-V1.
- **A2 hard-fail.** 0 `capability_domains` rows. Flagship vendors plainly compete on a 5-7 capability surface: asset-and-software discovery, vulnerability scanning (network / host / web / container / image), CVE matching and intelligence enrichment, risk-based prioritisation, remediation orchestration, patch and configuration deployment, compliance reporting. Rule #14's M2 floor (>=2 modules when capability count >=3) will kick in once these are loaded.
- **A4 hard-fail (Rule #20).** Both `catalog_tagline` and `catalog_description` are empty. The buyer-facing surface for the catalog detail page is blank.
- **A1 partial-fail (Rule #18 trademark in description) + (em-dash byte).** `domains.description` reads "Identification, prioritisation, and remediation of security vulnerabilities across endpoints, cloud, and applications." This is clean of vendor names but `domains.business_logic` reads "Vulnerability scanning engines (network, host, web, container, code), CVE matching, and risk scoring (em-dash) the algorithmic surface is the product." That em-dash byte (U+2014) violates the project's no-em-dash rule for catalog content. Also, `domains.description` uses British spelling "prioritisation" which is fine in body prose but the project's American-English rule prefers "prioritization"; the description warrants a small rewrite anyway when the catalog UX fields are drafted (A4).
- **A1 metadata pass.** Seven business-meta fields populated: `crud_percentage=35`, `business_logic` non-empty, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `certification_required=true`, `usa_market_size_usd_m=3500`, `market_size_source_year=2025`. No metadata gap.
- **B1 pass-by-exception.** VULN-MGMT is in the SKILL.md leadership-tier list, so zero masters does not block B1. **However**, that exception is itself open to reconsideration (see B2-V1). If the user removes VULN-MGMT from the leadership-tier list, B1 becomes a hard-fail and the audit re-classifies the entity drafting under MISSING in Bucket 1.
- **B5 / B11 / B12 vacuously pass.** No masters, so the embedded-master integrity check, alias gap, and lifecycle-states gap all vacuously pass at this load.
- **B9 vacuous on outbound + B10b hard-fail on inbound.** No outbound handoffs to audit. The single inbound handoff 36 (SAM, VULN-MGMT) has both `source_domain_module_id` and `target_domain_module_id` NULL. Source side is SAM's B10b (report-only); target side is VULN-MGMT's B10b but blocked-by-M1 (no VULN-MGMT module to point at).
- **B10 report-only.** SAM publishes `software_install.detected` (event 122) inbound to VULN-MGMT on payload `software_installations` (59), which VULN-MGMT consumes. Expected inbound coverage from a real workload is far larger: CMDB should publish `configuration_item.discovered` / `.classified`, SAM should also publish `software_install.eol_announced`, EDR / asset-discovery feeds, threat-intel KEV / EPSS updates, change windows from ITSM. These inbounds are all owed by other domains (or by candidate domains queued via the helper).
- **C1 pass.** 3 `business_function_domains` rows (SOC owner, IT Operations contributor, Software Engineering contributor). Reasonable shape.
- **C2 pass-by-vacuous.** No capabilities, so no capability-level override possible.
- **F2-F5 blocked-by-M1.** No modules, no system skills, score uncomputable.
- **H1 partial-fail (single handoff).** 0 of 1 cross-domain handoffs carry `handoff_processes` rows. Volume target for N=1: rounds to 1 agent_curated proposal. The proposal is in B1-V6.
- **Rule #15 notes-pollution check, clean.** No notes columns have content to revert.
- **S1 sweep result.** Tables with rows for `domain_id=13`: `solution_domains` 5, `domain_regulations` 7, `domain_data_objects` 2, `business_function_domains` 3, `domains.parent_domain_id` 1 (SECOPS). Tables expected non-zero but at zero: `capability_domains` 0, `domain_modules` 0, `domain_aliases` 0, `handoffs.source_domain_id` 0 (expected non-zero for any non-leaf market with a real workflow), `skills` 0. `domain_module_host_domains` legitimately 0 (no cross-cutting modules host on VULN-MGMT today). `data_object_relationships` touching the 2 non-master DDOs is dominated by the org_units (34) graph and does not include any VULN-MGMT-specific edges.
- **S2 / S3 vacuous.** No modules to iterate per-module; no VULN-MGMT-mastered data_objects to iterate per-master.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-V1 | **M1 hard-fail (Rule #14) + A2 hard-fail capability gap** | VULN-MGMT has 0 modules and 0 capabilities. Even under the leadership-tier exemption (which only waives B1, not M1), Rule #14 mandates >=1 `module_kind='full'` row. Flagship vendor surface supports a 4-module split: **VULN-DISCOVERY-SCANNING** (capabilities VULN-ASSET-DISCOVERY, VULN-SCAN-ORCHESTRATION; masters `vulnerability_scans`, `scan_targets`), **VULN-FINDINGS-MANAGEMENT** (capability VULN-FINDING-LIFECYCLE; masters `vulnerability_findings`, `cve_records`), **VULN-RISK-PRIORITIZATION** (capabilities VULN-RISK-SCORING, VULN-THREAT-CONTEXT; masters `vulnerability_risk_scores`, `kev_advisories`), **VULN-REMEDIATION-TRACKING** (capability VULN-REMEDIATION-ROUTING; masters `remediation_tickets`, `exception_records`). All four modules host on VULN-MGMT directly; none cross-host. Surface to user (B2-V2) before loading. | INSERT 4 `domain_modules` rows + 4 `domain_module_capabilities` mappings + the 7 capabilities listed above as `capabilities` rows. Loader path: `.tmp_deploy/fix_vuln_mgmt_m1_modules.ts`. **Gated on B2-V1 (leadership-tier reconsideration) and B2-V2 (module split confirmation)**. |
| B1-V2 | **A4 hard-fail (Rule #20), missing catalog UX fields** | `catalog_tagline` and `catalog_description` are both empty. Draft (buyer voice, workflow + value): tagline "Find every vulnerability in your environment, prioritise the ones that matter, and route remediation to the team that owns the fix." Description (1-3 paragraphs) draft to be surfaced for user review before write. | DRAFT both fields per Rule #20 buyer voice, surface to user for approval BEFORE write. Once a non-empty value exists, do NOT overwrite without explicit per-row approval (Rule #20). |
| B1-V3 | **A1 partial-fail (em-dash in `business_logic`)** | `domains.business_logic` carries the U+2014 em-dash byte in "(em-dash) the algorithmic surface is the product." This violates the project's no-em-dash rule for catalog content. The fact-sheet emitter sanitizes at render-time as a safety net, but the source row should be clean. | PATCH `domains.business_logic` to replace the em-dash with a comma or colon: "Vulnerability scanning engines (network, host, web, container, code), CVE matching, and risk scoring: the algorithmic surface is the product." |
| B1-V4 | **A1 partial-fail (British spelling in description)** | `domains.description` uses "prioritisation" — the project rule mandates American English ("prioritization"). | PATCH `domains.description` to "Identification, prioritization, and remediation of security vulnerabilities across endpoints, cloud, and applications." |
| B1-V5 | **B10b target_domain_module_id NULL on inbound 36 (blocked-by-M1)** | Handoff 36 (SAM, VULN-MGMT, `software_install.detected`, `software_installations`) has `target_domain_module_id=NULL`. Once B1-V1 lands, target module is VULN-DISCOVERY-SCANNING (the module that consumes new-install signals to drive scan targeting). | PATCH 36 set `target_domain_module_id=<VULN-DISCOVERY-SCANNING.id>`. Gated on B1-V1. Source side (`source_domain_module_id` for SAM) is SAM's B10b and goes to report-only. |
| B1-V6 | **H1 APQC tagging on inbound 36** | 0 of 1 cross-domain handoffs carry a `handoff_processes` row. Inbound 36 (SAM, VULN-MGMT, `software_install.detected`, payload `software_installations`) implements an IT-Operations / software-inventory leg whose closest cross-industry PCF activity is in the family "9.5 Manage information technology (IT) operations" with the specific child around hardware/software inventory tracking (around 10891 / 10912 family in the cross-industry framework). Confidence: medium L3 (the PCF cross-industry framework does not carve out vulnerability management cleanly; the parent activity is the cleanest match). | INSERT `handoff_processes` row `(handoff_id=36, process_id=<PCF id from lookup>, proposal_source='agent_curated', record_status='new')` after PCF lookup at fix time: `/processes?process_name=ilike.*software inventory*&source_framework=eq.apqc_pcf_cross_industry`. If no clean L3 match, defer to Discover Pass 3 per the procedure. |
| B1-V7 | **S1 zero-row anomaly, `domain_aliases`** | 0 `domain_aliases` rows. VULN-MGMT has well-known synonyms in the wild: "vulnerability management", "VM" (collides with virtual machines), "vuln management", "RBVM" (risk-based vulnerability management), "TVM" (threat and vulnerability management, the Microsoft / CrowdStrike framing), "VRM" (vulnerability response management, the ServiceNow framing). The skill's catalog-search and per-domain-skill trigger phrases both read from `domain_aliases`; absence here means the catalog UI and the per-domain agent both miss every synonym. | INSERT `domain_aliases` rows: `(alias='risk-based vulnerability management', alias_type='industry_term', label='RBVM')`, `(alias='threat and vulnerability management', alias_type='industry_term', label='TVM')`, `(alias='vulnerability response', alias_type='vendor_term', label='VR')`, `(alias='RBVM', alias_type='industry_term', label='RBVM')`. **Gated on B2-V6** (alias slate confirmation). |

#### APQC TAGGING (B1-H1)

0 of 1 cross-domain handoffs carry `handoff_processes` rows. Volume target rounds to 1 agent_curated proposal (see B1-V6 above for the full row). No deferrals beyond the one row.

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | Confidence |
|---|---|---|---|---|---|
| 36 | SAM -> VULN-MGMT | `software_install.detected` | `software_installations` | "9.5 Manage information technology operations" L2 family, IT asset / software inventory child (cross-industry id lookup at fix time around 10891 / 10912 family) | medium L3 |

1 candidate `agent_curated` proposal, 0 deferrals.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + A2 + A4 + A1 description + A1 business_logic) | 4 |
| BOUNDARY / handoff direction (B10b target FK on 36, B1-V5) | 1 |
| MISSING (alias slate, B1-V7) | 1 |
| APQC TAGGING (high-confidence, B1-H1, 1 candidate row, B1-V6) | 1 |
| MODULARIZATION ISSUES | 0 (routed to Bucket 2 per the band convention) |
| **Bucket 1 total** | **7 items** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-V1 | **Reconsider VULN-MGMT leadership-tier inclusion.** SKILL.md B1's leadership-tier exception list includes VULN-MGMT alongside SOAR, THREAT-INTEL, FINOPS, INTRANET, COLLAB-GOV. Leadership tier means "expected to have zero masters; checklist passes by exception." But every flagship vendor (Tenable One, Qualys VMDR, Rapid7 InsightVM, Wiz, ServiceNow VR) masters substantial workflow entities (scans, findings / vulnerabilities, remediation tickets, exceptions). This appears to be a misclassification, not a genuine leadership tier. If kept in leadership tier, the proposed 4-module + ~10-master Phase B load is over-scoped for the domain's catalog role. If removed from leadership tier, B1 becomes a hard-fail and the Phase B masters become genuine Bucket 1 items. | Editorial / catalog scope decision; the user owns the leadership-tier list. | (a) Keep VULN-MGMT in the leadership-tier list (capabilities + modules with no masters is the deploy shape; remediation lives in dependent domains; this audit's Bucket 3 masters defer). (b) Remove VULN-MGMT from the leadership-tier list and treat the Phase B masters as in-scope (the 4-module split with 8-10 masters is the real shape). (c) Defer to a separate scope-decision conversation. |
| B2-V2 | **VULN-MGMT module split.** B1-V1 proposes 4 modules (VULN-DISCOVERY-SCANNING, VULN-FINDINGS-MANAGEMENT, VULN-RISK-PRIORITIZATION, VULN-REMEDIATION-TRACKING). Vendor evidence (Tenable's Find / Prioritise / Fix triad, Qualys VMDR's Vulnerability / Threat / Compliance / Remediation tabs, ServiceNow VR's Vulnerable Items / Solution Management / Patch Orchestration / Exception Management) supports this. Alternatives: (alt-a) collapse to 3 modules (merge RISK-PRIORITIZATION into FINDINGS-MANAGEMENT); (alt-b) split DISCOVERY from SCANNING into two modules (Tenable Attack Surface Management and Tenable Nessus map there); (alt-c) add a 5th VULN-COMPLIANCE-REPORTING module for the PCI / FedRAMP / SOC 2 reporting surface that Qualys and Rapid7 emphasise. | Architectural intent + deployability decision. | (a) 4-module split as drafted. (b) alt-a / alt-b / alt-c per above. (c) Defer load, run formal Phase 0 vendor research first. |
| B2-V3 | **Capability slate.** B1-V1 names 7 capabilities: VULN-ASSET-DISCOVERY, VULN-SCAN-ORCHESTRATION, VULN-FINDING-LIFECYCLE, VULN-RISK-SCORING, VULN-THREAT-CONTEXT, VULN-REMEDIATION-ROUTING, plus an implicit VULN-COMPLIANCE-REPORTING in B2-V2 alt-c. Cross-cutting candidate: VULN-RISK-SCORING and VULN-THREAT-CONTEXT also apply to CSPM, DSPM, APP-SEC, EASM. Should these be authored cross-cutting (no domain prefix, per the SKILL.md Cross-cutting capability convention with >=3 domains)? | Cross-cutting capability naming decision. | (a) All 7 capabilities domain-prefixed (`VULN-...`). (b) Promote VULN-RISK-SCORING and VULN-THREAT-CONTEXT to cross-cutting (`RISK-BASED-SCORING`, `THREAT-EXPLOITABILITY-CONTEXT`) and add `capability_domains` rows to CSPM / DSPM / APP-SEC as those domains land. (c) Defer cross-cutting promotion to a separate cross-cutting-capability pass. |
| B2-V4 | **A1 description rewrite, em-dash + British spelling + Phase 0 rephrasing.** The description and business_logic both warrant a small rewrite (B1-V3 em-dash, B1-V4 British spelling). The rewrites can be done as 2 minimal PATCHes (mechanical) or combined with a larger Phase 0 rephrasing that also re-anchors the description on the vendor surface basis. | Editorial scope. | (a) 2 minimal PATCHes only. (b) Full Phase 0 description rewrite, anchoring on Tenable / Qualys / Rapid7 / Wiz / ServiceNow VR coverage shape. (c) Defer the rewrite, surface a draft separately. |
| B2-V5 | **A4 catalog UX fields, draft for user approval (Rule #20).** B1-V2 proposes draft tagline + description. Rule #20 mandates user approval BEFORE write. The draft tagline is "Find every vulnerability in your environment, prioritise the ones that matter, and route remediation to the team that owns the fix." (Note British "prioritise" intentional for marketing voice; user may want "prioritize" to match American English everywhere). Draft description is 2 paragraphs covering scope (assets covered: endpoints, servers, network gear, cloud workloads, containers, web apps, code) and the buyer outcome (closed-loop remediation, risk-based prioritisation, compliance reporting). | Marketing / buyer-voice authorship is user's call per Rule #20. | (a) Approve drafts as proposed. (b) Approve with edits (specify). (c) User authors both from scratch. (d) Defer A4 until after B1-V1 lands. |
| B2-V6 | **`domain_aliases` slate.** B1-V7 proposes 4 alias rows (RBVM, TVM, vulnerability response, RBVM as label). The label / alias semantics need clarification: `label` is the human-display abbreviation, `alias` is the search-match string. The proposed slate may miss key synonyms: "VRM", "Threat and Exposure Management", "TEM", "vuln scanning", "weakness management" (the British / academic term). | Alias slate authorship. | (a) Approve the 4 proposed rows. (b) Extend to include VRM, TEM, "vuln scanning", "weakness management" (specify). (c) Defer alias loading until after B1-V1 lands and the catalog UI tagging is exercised. |

### Bucket 3, Phase 0 pending (speculative)

Pass 2 ran the flagship-vendor enumeration against Tenable One, Qualys VMDR, Rapid7 InsightVM, Wiz, ServiceNow Vulnerability Response, Microsoft Defender Vulnerability Management, CrowdStrike Falcon Spotlight, Ivanti Neurons, Vicarius vRx, Action1, Greenbone OpenVAS, Nucleus Security, Vulcan Cyber, Brinqa. Compliance anchor is PCI-DSS 4.0 (11.3), HIPAA Security Rule (164.308 / 164.312), SOX 404 ITGC (vulnerability and patch evidence), FedRAMP / NIST 800-53 (RA-5 + SI-2), GDPR Article 32, NIS2 Article 21. The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from analyst flagship-vendor knowledge.

#### MISSING (proposed master entities once B2-V1 is decided)

| Candidate entity | Vendor knowledge basis | Proposed module (per B1-V1 split) |
|---|---|---|
| `vulnerability_scans` | Tenable Nessus scan jobs, Qualys VM scan jobs, Rapid7 scan engines, Wiz cloud-config scans. First-class master with state machine `scheduled` -> `running` -> `completed` / `failed` / `cancelled`, pattern flag `has_submit_lock=true` once results are produced. | VULN-DISCOVERY-SCANNING |
| `vulnerability_findings` | Tenable findings, Qualys vulnerabilities, Rapid7 vulnerability instances, ServiceNow VR Vulnerable Items. The per-(asset, CVE) instance row. State machine `open` -> `confirmed` -> `in_remediation` -> `resolved` / `false_positive` / `risk_accepted`. Pattern flag `has_personal_content=false` typically. | VULN-FINDINGS-MANAGEMENT |
| `cve_records` | Catalog enrichment of CVE / NVD entries. Ships pre-populated by the vendor. Config-shape master with no workflow gates; static-shape exemption per Rule #12 likely applies. | VULN-FINDINGS-MANAGEMENT |
| `vulnerability_risk_scores` | EPSS scores, CVSS scores, vendor-proprietary risk scores (Tenable VPR, Qualys TruRisk, Rapid7 Real Risk, Microsoft Exposure Score). State machine `pending` -> `current` -> `stale`, recomputation automated; no permission gates. | VULN-RISK-PRIORITIZATION |
| `kev_advisories` | CISA Known Exploited Vulnerabilities catalog. Ingested feed; static-shape master tracking advisory metadata, due-dates, exploit context. | VULN-RISK-PRIORITIZATION |
| `remediation_tickets` | ServiceNow VR Solution Management, Tenable Remediation Projects, Vulcan Cyber Campaigns, Brinqa Plays. State machine `proposed` -> `assigned` -> `in_progress` -> `verified` -> `closed` / `reopened`. Pattern flag `has_single_approver=true` for risk-acceptance approval. | VULN-REMEDIATION-TRACKING |
| `exception_records` | Risk acceptance / exception requests across all flagship vendors. State machine `requested` -> `under_review` -> `approved` -> `active` -> `expired` / `revoked`. Pattern flag `has_single_approver=true`. | VULN-REMEDIATION-TRACKING |
| `scan_targets` | Asset scope definitions (IP ranges, asset tags, cloud account / subscription scopes). Config-shape master with lifecycle `defined` -> `active` -> `decommissioned`. | VULN-DISCOVERY-SCANNING |

#### MODULARIZATION candidates

- **Promote VULN-RISK-PRIORITIZATION to a cross-cutting `EXPOSURE-MGMT` module** that also hosts on DSPM, CSPM, APP-SEC, EASM. Vendor evidence: Tenable One, Wiz, Qualys all unify finding-prioritisation across vulnerability + posture + attack-surface; the prioritisation engine is the cross-domain layer. This is the Continuous Threat Exposure Management framing in the CTEM candidate queued via the helper, but the same engine pattern could also be modelled as a cross-cutting module rather than a separate domain.
- **Split DISCOVERY from SCANNING** if Tenable Attack Surface Management's distinct UI surface warrants modular separation from the per-scanner engine. Adds a 5th module VULN-ASSET-DISCOVERY.

#### Compliance regulation candidates (additional rows)

- **PCI-DSS 4.0 (requirement 11.3)** mandatory for cardholder-data scope; already in scope under the general ISO/IEC 27001 row but PCI-specific scanning cadence (quarterly + on change) is a distinct compliance entity.
- **HIPAA Security Rule (164.308(a)(1)(ii)(A) + 164.312(a)(1))** mandatory for PHI environments; risk-analysis and vulnerability-scanning obligations.
- **FedRAMP / NIST 800-53 RA-5 + SI-2** mandatory for federal cloud workloads; named controls for vulnerability scanning and flaw remediation.
- **SOX 404 ITGC** for public-company IT environments where patch and vulnerability evidence is a control objective.
- **GDPR Article 32** general security-of-processing obligation; already partly covered by NIS2 but Article 32 is the specific anchor for vulnerability management evidence.

#### Candidate-domain queue (appended to `audits/_missing-domains.md`)

The audit surfaced 4 adjacent markets where the catalog has no `domains` row but flagship-vendor research suggests a real point-solution market. Queued via `append_missing_domain.ts`:

- **EASM**, External Attack Surface Management (Censys, Palo Alto Cortex Xpanse, Microsoft Defender EASM, BitSight, SecurityScorecard External, Tenable Attack Surface Management). Internet-asset discovery + shadow-IT inventory + takeover-risk + certificate posture. Distinct from CAASM (already queued) which is internal-asset-centric.
- **PTAAS**, Penetration Testing as a Service (Synack, Cobalt.io, HackerOne, Bugcrowd, NetSPI, Pentera, Horizon3.ai NodeZero). Engagement orchestration + autonomous and continuous pentesting + bug-bounty operations.
- **CTEM**, Continuous Threat Exposure Management (XM Cyber, Picus Security, Cymulate, AttackIQ, Pentera, SafeBreach). Attack-path analysis + breach-and-attack-simulation + control validation. Gartner-framed category sitting above vulnerability management; potentially modellable as a cross-cutting module rather than a domain (see Bucket 3 modularization candidate above).
- **VULN-INTEL**, Vulnerability Intelligence and Risk Prioritization (Mandiant Vulnerability Intelligence, Recorded Future Vulnerability Intelligence, Flashpoint, Vulncheck, Tenable Vulnerability Intelligence, Rapid7 Threat Command). Exploit-in-the-wild feeds + CISA KEV ingestion + EPSS scoring + threat-actor and campaign linkage to CVEs.

The following adjacent candidates were ALREADY in the queue from prior audits and were not re-queued by this audit: **PATCH-MGMT** (queued by an earlier security audit), **CAASM** (queued earlier), **CSPM** (queued by DSPM 2026-05-30 audit), **CIEM** (queued by DSPM 2026-05-30), **EDR** (already in queue), **PAM** (already in queue).

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces a Phase 0 markdown at `c:/tmp/VULN-MGMT-phase0-<date>.md` confirming per-entity vendor coverage), or eyeball-mode (user names which of the 8 entity candidates + 5 regulation candidates + 2 modularization candidates to treat as confirmed, gated on B2-V1's leadership-tier decision).

### Cross-bucket dependencies

- **B2-V1 (leadership-tier reconsideration) is the upstream gate.** If the user keeps VULN-MGMT in the leadership-tier list, Bucket 3's 8 entity candidates do NOT become Bucket 1 items; they're discarded. If the user removes VULN-MGMT from the leadership-tier list, the 8 entity candidates become real MISSING items and roll into Bucket 1 via a follow-up audit pass.
- **B1-V1 (M1 modules + capabilities) gates B1-V5 (B10b target FK PATCH).** No VULN-MGMT module exists to point at until B1-V1 lands.
- **B1-V1 also gates B1-V7 (`domain_aliases`)?** No, aliases are domain-scoped, not module-scoped. They can load independently of the module split.
- **B2-V2 (module split) gates B1-V1.** The 4-module shape must be confirmed.
- **B2-V3 (capability cross-cutting promotion) feeds B1-V1.** Whether the capabilities ship prefixed or cross-cutting changes the load shape.
- **B2-V4 + B2-V5 are independent** of M1; the description / business_logic / catalog UX field rewrites can land in any order.
- **B2-V6 (alias slate) feeds B1-V7.** The alias slate authorship is the gating decision.
- **B1-V6 (APQC tag on handoff 36) is independent** of M1 — handoffs are domain-keyed.
- Buckets 2 and 3 are otherwise independent of each other modulo B2-V1's gate on Bucket 3.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `V2, V3, V4, V6`), or `skip`.

- **B1-V1 (M1 modules + capabilities)** is gated on B2-V1 (leadership tier) + B2-V2 (module split) + B2-V3 (capability slate).
- **B1-V2 (catalog UX fields)** is gated on B2-V5 (user-approved wording per Rule #20).
- **B1-V3 (em-dash PATCH on business_logic)** is mechanical; no gating.
- **B1-V4 (British -> American spelling PATCH on description)** is mechanical; no gating; can run independent or alongside B1-V3.
- **B1-V5 (target_domain_module_id PATCH on inbound 36)** is gated on B1-V1.
- **B1-V6 (APQC tag on handoff 36)** is independent; mechanical PCF lookup + INSERT.
- **B1-V7 (domain_aliases load)** is gated on B2-V6 (slate authorship).

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-V1 (leadership-tier reconsideration):** (a) keep, (b) remove, (c) defer.
- **B2-V2 (module split):** (a) 4-module split as drafted, (b) alt-a / alt-b / alt-c, (c) defer.
- **B2-V3 (capability cross-cutting):** (a) all prefixed, (b) promote VULN-RISK-SCORING + VULN-THREAT-CONTEXT to cross-cutting, (c) defer.
- **B2-V4 (description rewrite scope):** (a) 2 minimal PATCHes, (b) full Phase 0 rewrite, (c) defer.
- **B2-V5 (catalog UX field drafts):** (a) approve drafts, (b) approve with edits, (c) user authors, (d) defer.
- **B2-V6 (alias slate):** (a) approve 4, (b) extend, (c) defer.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 8 entity candidates + 5 regulation candidates + 2 modularization candidates to treat as confirmed. Note: all of Bucket 3 is gated on B2-V1.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit.

| Owing domain | Owed work |
|---|---|
| SAM | B10b: populate `source_domain_module_id` on outbound 36 (`software_install.detected`, payload `software_installations`). The source module is SAM-INST-MGMT (which masters `software_installations`). Also consider whether SAM should publish `software_install.eol_announced` and `software_install.uninstalled` events alongside; both are plausibly consumed by VULN-MGMT for scope-management. |
| CMDB | Expected outbound to VULN-MGMT not loaded: `configuration_item.discovered`, `configuration_item.classified`, `configuration_item.decommissioned` would feed VULN-MGMT's asset-scope and target-discovery layer. None exist today. CMDB B9 owes outbound handoffs on these once VULN-MGMT modularizes. |
| ITSM | Expected outbound to VULN-MGMT not loaded for `change_request.scheduled` (change-windows feed scan scheduling). Expected inbound from VULN-MGMT not loaded for `vulnerability_finding.confirmed` -> `incidents` / `change_requests`. ITSM B9 will need both legs once VULN-MGMT modularizes. |
| SOAR | Expected inbound from VULN-MGMT not loaded for `vulnerability_finding.confirmed` -> SOAR playbook activation. SOAR B10 receives nothing from VULN-MGMT today. |
| THREAT-INTEL | Expected outbound to VULN-MGMT not loaded for `cve.kev_added`, `cve.epss_changed`, `threat_actor.campaign_targeting_cve`. THREAT-INTEL B9 owes these once VULN-MGMT modularizes; the candidate VULN-INTEL domain (queued) would absorb much of this if promoted. |
| HCM | No active work owed. HCM's `org_units` master is consumed via the optional `embedded_master` shell on VULN-MGMT; that pattern is fine (Rule #16 infrastructure master + optional necessity). No HCM-side action. |

### Decisions

_(empty until reviewed)_

### Fixes applied

_(empty; this is a read-only audit pass; no writes were made to the catalog)_
