# COLLAB-GOV audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: **headless `domains` row** (id 127, parent_domain_id 91 = ECM). Zero `domain_modules`, zero `domain_module_data_objects`, zero `domain_data_objects`, zero `data_objects` mastered, zero `handoffs` (outbound or inbound), zero `skills`, zero `domain_regulations`, zero `domain_aliases`, zero sub-domains, zero `data_object_lifecycle_states`, zero `trigger_events`. 7 capabilities linked, 11 solutions linked, 2 `business_function_domains` rows.
- Vendor-surface basis: M365 / Google Workspace governance pure-plays already on `solution_domains` (AvePoint Confidence Platform, ShareGate, Syskit Point, Rencore Governance, Quest On Demand for Microsoft 365, CoreView, ENow Application Insights, Orchestry, ProvisionPoint 365, Microsoft Syntex) plus Microsoft Purview Information Protection (partial coverage). Microsoft-native (Syntex) plus 9 third-party governance specialists, with one cross-listed security platform.
- SKILL.md line 789 lists COLLAB-GOV in the leadership-tier exception set (B1 expected zero masters). However the vendor surface is a real point-solution market with dedicated commerce: AvePoint Confidence Platform, ShareGate, Syskit Point, and CoreView are flagship products customers buy as their system of record for M365 / Google Workspace governance. This looks closer to a real point-solution market than to an aggregation-tier domain (REV-INTEL / SALES-PERF reads upstream from CRM / ERP; COLLAB-GOV writes lifecycle policies and runs sprawl-detection sweeps against the native repository). The classification flag in SKILL.md may have been carried over from an early load and warrants user adjudication. Sibling INTRANET is in the same shape (also on the leadership-tier list, also with a real specialist-vendor surface), and that audit (2026-05-30) raised the same question.
- The classification decision is a Bucket 2 item and gates Bucket 3 (the candidate-master surface) entirely. Until it is settled, M1 / B-band / E / F / H findings are conditional.
- **Bucket 1 (in-scope, agent fixable):** 1 items.
- **Bucket 2 (surface-for-user, judgment):** 8 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.
- Candidates queued to `audits/_missing-domains.md`: 3 (SAAS-BACKUP new, TENANT-MIGRATION new, M365-MGMT new).

### Pass 1 - Structural (per-domain completeness checklist)

| Band | Result | Evidence / next step |
|---|---|---|
| S1 (FK sweep to domains) | PARTIAL | `capability_domains` 7 rows (pass), `solution_domains` 11 rows (pass), `business_function_domains` 2 rows (pass), `domain_modules` 0 rows (FAIL M1 under strict reading of Rule #14), `domain_data_objects` 0 rows (leadership-tier exception OR Phase B gap, depends on classification), `domain_regulations` 0 rows (pass-by-allowance, see Bucket 2), `domain_aliases` 0 rows (pass-by-allowance), `handoffs.source_domain_id` 0 rows (FAIL B9 unless leadership-tier with no published events), `handoffs.target_domain_id` 0 rows (no inbound), `skills` 0 rows (FAIL F2 only on the real-market route), `domains.parent_domain_id` set to 91 (ECM, routinely-zero exception passes informationally). |
| S2 (per-module DMDO + capability coverage) | N/A | no modules to sweep. |
| S3 (per-master indirect coverage) | N/A | no masters to sweep. |
| A1 (domains row metadata) | PASS | `crud_percentage=80`, `business_logic` non-empty ("Collaboration-graph inventory crawling, ownership inference, sprawl detection, and external-sharing risk scoring over collaboration metadata."), `min_org_size='30 m <2500'`, `cost_band='$$'`, `usa_market_size_usd_m=800`, `market_size_source_year=2024`, `certification_required=false`. All Rule #8 fields populated. |
| A2 (capabilities) | PASS | 7 capabilities: COLLAB-GOV-INVENTORY, COLLAB-GOV-LIFECYCLE, COLLAB-GOV-PERMS, COLLAB-GOV-EXTSHARE, COLLAB-GOV-STALE, COLLAB-GOV-BACKUP, COLLAB-GOV-MIGRATE. Above the 3-row floor; the 7-row count triggers Rule #14's "domains with >=3 capabilities need >=2 full modules" - only relevant if the real-market route is picked. Note that COLLAB-GOV-BACKUP and COLLAB-GOV-MIGRATE are arguably their own markets (Veeam, Druva, Spanning sell SaaS backup independently; ShareGate, BitTitan sell tenant migration independently); both queued as candidate domains in `_missing-domains.md`. |
| A3 (solutions with coverage_level) | PASS | 11 solutions: 10 `primary` (AvePoint Confidence Platform, ShareGate, Syskit Point, Rencore Governance, Quest On Demand for Microsoft 365, CoreView, ENow Application Insights, Orchestry, ProvisionPoint 365, Microsoft Syntex) + 1 `partial` (Microsoft Purview Information Protection). Above the 3-row floor with a strong primary mix. |
| A4 (catalog UX fields) | FAIL | `catalog_tagline=''`, `catalog_description=''`. Drafts proposed in Bucket 1 / Bucket 2; per Rule #20 these get user-approved before write. |
| A5 (vendor ownership refresh) | SKIPPED | opt-in only. Notable acquisitions to flag if requested: ShareGate is owned by Workleap (formerly GSoft, the parent renamed 2023); CoreView acquired Simeon Cloud (2022) and integrates M365 tenant management with intune-like governance. Surface to user if vendor-ownership pass is requested. |
| M1 (>=1 module per domain) | FAIL (or PASS by leadership-tier carve-out) | 0 `domain_modules` rows. Rule #14 says "every `domains` row MUST have >=1 `domain_modules` row with `module_kind='full'`. No exceptions, including leadership-tier" but sibling INTRANET and the entire SKILL-line-789 leadership-tier list (REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM, OP-RES, BCM, SECOPS, SOAR, THREAT-INTEL, TPRM, VULN-MGMT, PRIV-MGMT, FINOPS, INTRANET, COLLAB-GOV) carry zero modules in practice. Either the leadership-tier list is being given a soft waiver, or every entry on it owes a landing module. Bucket 2 item 1 resolves the classification; the M1 fix shape follows from it. |
| M2 (>=2 modules when >=3 capabilities) | FAIL | depends on M1. 7 capabilities means the real-market route needs >=2 modules, not just one. |
| M4 (every capability has a realizing module) | FAIL | 7 orphan capabilities. |
| M5 / M6 / M7 | N/A | nothing to check until M1 is resolved. |
| B1 (>=1 master data_object) | PASS-by-leadership-tier-exception | leadership-tier exception applies if upheld; otherwise FAIL. Real-market route needs Phase 0 from Bucket 3's candidate list. |
| B2-B12 | N/A | no masters to evaluate. |
| C1 (business_function_domains owner) | PASS | 1 `owner` row (End-User Computing, a sub-function of IT), 1 `contributor` row (Security). C-band light but technically meets the floor; consider whether Security is owner instead of contributor given the external-sharing controls and permissions-audit capabilities (Bucket 2). |
| C2 (BF-capability overrides) | PASS-by-allowance | no overrides needed unless a capability legitimately diverges from End-User Computing. COLLAB-GOV-EXTSHARE and COLLAB-GOV-PERMS are plausibly Security-owned (not End-User Computing); surfaced as Bucket 2. |
| D1 (UI spot-check) | DEFERRED | nothing loaded yet; no spot-check needed until fixes land. |
| E1-E6 (roles) | N/A | E1 vacuously passes for a leadership-tier read-only domain (no modules to bundle); under the real-market route, E-band becomes a Phase E load step after M-band lands. |
| F1-F7 (skill layer) | DEFERRED | F2 / F3 / F5 inapplicable until M1 is resolved. The leadership-layer rule at SKILL.md line 1569 explicitly waives system-skill creation for leadership-tier domains. |
| H1 (APQC tagging on cross-domain handoffs) | VACUOUSLY PASS | zero cross-domain handoffs to tag. No volume expectation applies. |

### Pass 2 - Market audit (semantic)

No subagent JSON was generated because the audit is dominated by the prior classification question; running a market-surface subagent before Bucket 2 item 1 is settled would produce a "COLLAB-GOV masters X, Y, Z" surface based on the M365-governance vendor list, then the user might still rule leadership-tier and discard the work. The vendor surface and candidate masters are surfaced inline below (Bucket 3) so the user can either greenlight Phase 0 vendor research as the next step or reject the real-market route entirely.

If Bucket 2 item 1 flips COLLAB-GOV to "real point-solution market", the candidate masters in Bucket 3 become the Phase 0 vendor-research input set.

#### Vendor-surface basis (manual enumeration; replaces the subagent run for this audit)

Pure-play M365 / Google Workspace governance specialists chosen from the 11 `solutions` rows already linked. The market is dominated by Microsoft ecosystem; Google Workspace governance is thinner (Bettercloud, Coreview Cloud Management have moved between markets).

- **AvePoint Confidence Platform** (`primary`) - the original M365 governance leader since SharePoint 2007; suite spans tenant migration, policy enforcement, backup, classification, records management. AvePoint owns the breadth axis.
- **ShareGate** (`primary`, owned by Workleap) - lifecycle automation + permissions audit + content migration; SMB and mid-market focus. Migration was the original wedge (ShareGate Migrate), governance is the consolidation play (ShareGate Protect).
- **Syskit Point** (`primary`) - tenant inventory + access review + policy enforcement; positions as "self-service governance for IT-light orgs".
- **Rencore Governance** (`primary`) - SharePoint and Teams governance with strong customization-monitoring (workflow inventory, Power Platform sprawl).
- **Quest On Demand for Microsoft 365** (`primary`) - tenant migration + recovery + audit reporting; Quest's full M365 stack.
- **CoreView** (`primary`) - cross-workload M365 management; delegated administration + license optimization + tenant inventory.
- **ENow Application Insights** (`primary`) - M365 service health monitoring + license usage analytics; thinner on lifecycle, heavier on monitoring.
- **Orchestry** (`primary`) - workspace lifecycle automation; provisioning templates + archive automation + Teams lifecycle.
- **ProvisionPoint 365** (`primary`) - provisioning-first; templated workspace creation + lifecycle policies.
- **Microsoft Syntex** (`primary`) - Microsoft-native content classification + AI document processing; bridges into ECM territory.
- **Microsoft Purview Information Protection** (`partial`) - sensitivity labels + retention + DLP integration. Cross-listed with DLP; partial coverage because Purview spans far beyond governance.

Compliance / regulatory specialists: GDPR (Article 30 processing records, DSAR-shaped data-subject requests against M365 / Google Workspace shares), SOX (records retention on financial-content libraries), HIPAA (sensitive-content controls in healthcare orgs running M365), eDiscovery / FRCP (Microsoft Purview eDiscovery integration). No FCRA / FDA carve-outs.

### Pass 3 - Neighbor discovery

Zero outbound and zero inbound handoffs in the catalog mean the catalog has no edges from which to auto-derive the neighbor set for COLLAB-GOV today. Manually-derived neighbor list (based on the M365-governance vendor surface and the domain's described scope):

| Neighbor (manually inferred) | Why | Edge weight signal |
|---|---|---|
| ECM (parent_domain_id=91) | Parent market: COLLAB-GOV governs sites / libraries / containers that ECM masters. Provisioning template + retention policy hand-offs. | Heavy (parent-child relationship). |
| WSC (Workstream Collaboration, id 75) | Chat workspace inventory + Teams lifecycle policy + external-share controls on channels. | Heavy. |
| DLP (Data Loss Prevention, id 139) | External-sharing violations and sensitive-content placement detected by DLP feed governance remediation workflows. | Medium-heavy. |
| DSPM (Data Security Posture Management, id 140) | Permission posture + risk scoring; DSPM publishes risk signals that governance ingests for remediation. | Medium. |
| IGA (Identity Governance and Administration, id 35) | Access reviews triggered when group membership drift threatens shared sites; IGA owns the user/group lifecycle. | Medium. |
| UEM (Unified Endpoint Management, id 86) | Device-shaped controls on collaboration access (intune conditional access on SharePoint, file-sync drives). | Light. |
| SECOPS (Security Operations, id 11) | Permissions-audit incidents and external-share incidents may escalate to SOC for investigation. | Light. |
| KMS (Knowledge Management, id 33) | Stale content detection and retention policy intersect KM article archival. | Light. |
| ITSM (id varies, IT Service Management) | Access-request and license-request workflows route through ITSM service catalogs. | Light. |
| ATS / HCM / FINANCE (consumers of collaboration) | Cross-functional consumers of sites and libraries; governance scope rather than handoff direction. | Edge-of-market. |

Because no `handoffs` rows exist yet, Pass 4 pairwise reconciliation is vacuous in both directions: no NULL FKs to backfill, no missing handoffs the catalog implies (catalog implies nothing), no boundary integrity gaps, no `data_object_relationships` mirrors to check. Pass 4 becomes meaningful only after Phase B candidates from Bucket 3 land.

### Pass 4 - Pairwise reconciliation per neighbor

Vacuous - see Pass 3. Listed for completeness; no in-scope or report-only findings produced from this pass.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (deterministically fixable on COLLAB-GOV alone)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `catalog_tagline` and `catalog_description` are empty on the `domains` row. Rule #20 requires both, written in buyer voice (workflow + value), not analyst voice. | Draft both fields per Rule #20, surface to user for explicit per-row approval BEFORE writing. Proposed drafts: `catalog_tagline = "Inventory every workspace, enforce sharing policies, and clean up sprawl across your collaboration tenant."`; `catalog_description = "Discover every team site, channel, file-sync drive, and group container in your collaboration tenant. Run permission audits and external-share reviews on a schedule, archive workspaces that have gone stale, and automate provisioning so new workspaces ship with the right ownership and retention policy from day one. Catch oversharing before it becomes a data incident, surface broken or duplicated permission inheritance, and give business owners a path to attest to access without an IT ticket." `These are agent drafts (Rule #20: draft, surface, approve, write); user has the final wording. |

No other STRUCTURAL band failures land in Bucket 1 because every other failure (M1, B-band, E, F) is gated by the Bucket 2 classification question. Once that lands, the corresponding fixes become structurally clear and move into Bucket 1 on the follow-up audit.

#### MISSING (entity gaps) - zero in Bucket 1

Every entity-shaped gap is conditional on Bucket 2's classification decision; routed to Bucket 3 below.

#### WRONG-OWNERSHIP - zero

#### SCOPE-CREEP - zero

#### BOUNDARY - zero in Bucket 1

Inbound handoff candidates the vendor surface implies (DLP publishing external-share incidents, DSPM publishing risk-score elevations, IGA publishing access-review-due events, ECM publishing site-provisioned events) are not authored on COLLAB-GOV's side. Each goes into the Report-only follow-ups section at the bottom of this audit, owed by the source domain's next B9 pass.

#### APQC TAGGING - zero (vacuously, no handoffs to tag)

### Bucket 2 - Surface-for-user (judgment calls)

1. **Classification: leadership-tier vs real point-solution market.** SKILL.md line 789 lists COLLAB-GOV in the leadership-tier exception set (expected to have zero masters, no system skill). The vendor surface (AvePoint Confidence Platform, ShareGate, Syskit Point, CoreView, Rencore Governance, Orchestry) is a real software market: customers buy a dedicated product as their system of record for M365 / Google Workspace governance, and the product writes lifecycle policies, runs sprawl-detection sweeps, and triggers remediation workflows against the native repository. The current `domains.description` ("Inventory, ownership, lifecycle policy, permissions audit, external-sharing controls, sprawl detection, and stale-content remediation across enterprise collaboration suites") reads as a market description, not an aggregation-tier signal. Options: **(a) confirm leadership-tier** (COLLAB-GOV stays headless; B / E / F / H pass by exception; M1 the lone open finding; add a single landing `domain_modules` row to satisfy Rule #14 minimum); **(b) flip to real point-solution market** (M1 + B + E + F + H all need to land; trigger Phase 0 vendor research from Bucket 3's candidate list; load typical modules `COLLAB-GOV-INVENTORY`, `COLLAB-GOV-LIFECYCLE`, `COLLAB-GOV-PERMS`, `COLLAB-GOV-EXTSHARE`, `COLLAB-GOV-STALE` and optionally `COLLAB-GOV-BACKUP`, `COLLAB-GOV-MIGRATE` only if SAAS-BACKUP and TENANT-MIGRATION candidates do not promote); **(c) hybrid** (leadership-tier landing module plus a `module_kind='starter'` for the inventory + permissions-audit minimum surface). Independent of every other Bucket 2 item, but **gates Bucket 3 entirely**.

2. **Catalog UX text approval (Bucket 1 B1-S1 depends on this).** Approve, edit, or reject the proposed `catalog_tagline` and `catalog_description` drafts in Bucket 1 B1-S1. Rule #20 forbids the agent from writing without explicit per-row approval. Independent of Bucket 2 item 1 unless the user picks (a) leadership-tier, in which case the buyer voice should pivot from "M365 governance product" to "collaboration-governance signal layer".

3. **Business-function ownership: End-User Computing as owner is debatable.** The single `responsibility_type='owner'` row points at End-User Computing (an IT sub-function); Security is `contributor`. Three of the seven capabilities (`COLLAB-GOV-PERMS`, `COLLAB-GOV-EXTSHARE`, and arguably `COLLAB-GOV-STALE`) are typically Security-owned in regulated orgs (permissions audit and external-sharing controls are core to the InfoSec mandate). Decide whether to (a) re-cast `business_function_domains` so Security is owner and End-User Computing is contributor, (b) keep End-User Computing as owner and add `business_function_capabilities` overrides for the three Security-leaning capabilities, or (c) leave as is. Independent of Bucket 2 item 1.

4. **Regulations scope.** `domain_regulations` is empty. Governance-relevant regulations: GDPR (Articles 5 / 30 / 32 data-protection accountability for processing records and security controls on collaboration data), CCPA (data inventory and access controls on consumer-personal-data shares), SOX (records retention on financial libraries), HIPAA (sensitive-content controls in healthcare orgs), eDiscovery / FRCP (Microsoft Purview eDiscovery hooks for legal holds). None of these are FCRA-shaped certification-blockers, so `certification_required=false` stays. Decide whether to attach any of GDPR / CCPA / SOX / HIPAA at `applicability='mandatory'` or `'recommended'`. Independent of Bucket 2 item 1.

5. **Modularization (only loadable on the Bucket 2 item 1 real-market route).** If the user picks (b) or (c), decide the module split. Proposed shape mirrors the 7 capabilities one-for-one (7 modules feels heavy); a tighter 4-module split that respects the Rule #14 ">=3 capabilities needs >=2 modules" floor: `COLLAB-GOV-INVENTORY` (inventory + ownership inference), `COLLAB-GOV-LIFECYCLE` (provisioning + archive + retention policy), `COLLAB-GOV-PERMS` (permission audit + access reviews + external-sharing controls), `COLLAB-GOV-STALE` (stale content detection + remediation). `COLLAB-GOV-BACKUP` and `COLLAB-GOV-MIGRATE` either fold into LIFECYCLE or get promoted out to their own SAAS-BACKUP / TENANT-MIGRATION domains (both queued in `_missing-domains.md`). Direct dependency on Bucket 2 item 1 and on the SAAS-BACKUP / TENANT-MIGRATION triage outcomes.

6. **Existing `COLLAB-GOV-BACKUP` capability vs SAAS-BACKUP domain candidate (queued mention_count=1).** The capability is wired to COLLAB-GOV in `capability_domains`. The SAAS-BACKUP candidate (Veeam Backup for Microsoft 365, AvePoint Cloud Backup, Druva for Microsoft 365, Spanning, Keepit, HYCU, Barracuda Cloud-to-Cloud Backup) is a distinct market that backs up beyond M365 (Salesforce, Google Workspace, Microsoft Dynamics, Box, Slack), and several pure-play vendors (Druva, Spanning, Keepit) have no collaboration-governance offering. If SAAS-BACKUP gets promoted, COLLAB-GOV-BACKUP capability likely demotes (move under SAAS-BACKUP and add the `capability_domains` row to that domain) or stays as a partial-overlap link.

7. **Existing `COLLAB-GOV-MIGRATE` capability vs TENANT-MIGRATION domain candidate (queued mention_count=1).** Same shape as item 6 but for migration. ShareGate Migrate, AvePoint Fly, Quest On Demand Migration, BitTitan MigrationWiz, and CloudM Migrate compete in tenant migration as a dedicated market; many M&A-shaped migrations are bought separately from the governance suite. If TENANT-MIGRATION gets promoted, COLLAB-GOV-MIGRATE capability likely demotes.

8. **`domain_aliases` empty.** Common synonyms for the M365-governance market: `microsoft 365 governance`, `m365 management`, `sharepoint governance`, `teams governance`, `tenant administration`, `workspace governance`, `collaboration sprawl management`. Aliases feed both catalog search and the per-domain skill's runtime trigger phrases. Decide whether to load these (7 candidates) and which `alias_type` each is. Independent of Bucket 2 item 1.

### Bucket 3 - Phase 0 pending (speculative)

The 8 candidate masters below are speculative until vendor-research confirms them. Each is keyed against the Bucket 2 item 1 real-market branch; if the user picks leadership-tier, every Bucket 3 item is dropped wholesale. Several entities involve dual-master tension with sibling DLP / DSPM / IGA domains (noted per row).

| # | Candidate | Proposed module | Vendor evidence basis | Recommended verification |
|---|---|---|---|---|
| B3-1 | `collaboration_workspaces` (or `tenant_workspaces`) + `workspace_owners` + `workspace_membership` | COLLAB-GOV-INVENTORY | Universal (AvePoint Confidence, ShareGate, Syskit Point, CoreView, Orchestry all model an inventory entity that unifies SharePoint sites + Teams workspaces + Microsoft 365 Groups + Yammer communities under one record). | Pull `/sites` (AvePoint API), `/inventory` (Syskit Point), `/teams` (CoreView). Confirm whether the inventory entity is a single polymorphic master or split by container type. |
| B3-2 | `workspace_lifecycle_policies` + `provisioning_templates` + `workspace_archive_actions` | COLLAB-GOV-LIFECYCLE | Universal. Orchestry, ProvisionPoint 365, AvePoint Maestro all model provisioning templates + lifecycle stages (`active`, `under_review`, `archived`, `purged`). | Vendor doc walk: Orchestry templates, ProvisionPoint 365 site-design library, AvePoint MyHub lifecycle stages. |
| B3-3 | `permissions_audits` + `permission_findings` + `access_reviews` + `attestation_responses` | COLLAB-GOV-PERMS | Universal. AvePoint Policies, ShareGate Protect, Syskit Point access-review module all model scheduled scans + finding tickets + attestation workflows. Distinct from IGA's user/role attestations (IGA owns the identity-side cycle; COLLAB-GOV owns the workspace-side cycle). Tension with IGA: where does the canonical `access_reviews` master live? Surface to Bucket 2 if user picks real-market route. | Vendor doc walk + cross-check IGA's existing data_objects. |
| B3-4 | `external_sharing_policies` + `external_share_links` + `guest_users` | COLLAB-GOV-EXTSHARE | Common (AvePoint Cloud Governance, ShareGate Protect, Syskit, Rencore). Microsoft Purview labels overlap with `external_sharing_policies` at the classification axis. Lifecycle gates: `pending_review`, `approved`, `expired`, `revoked`. | Vendor doc walk + DLP cross-check (DLP owns the data-classification incident side; COLLAB-GOV owns the share-link lifecycle side). |
| B3-5 | `stale_content_signals` + `archive_recommendations` + `remediation_actions` | COLLAB-GOV-STALE | Universal but thinly modeled: usually a derived view rather than a primary table. AvePoint policies, Orchestry archive automation, Syskit stale-content reports. Possibly a `derived` data_object rather than a `master`. | Decide whether `stale_content_signals` is a real master or a query view on top of `collaboration_workspaces` last-access timestamps. |
| B3-6 | `m365_backup_jobs` + `backup_recovery_points` + `restore_operations` | COLLAB-GOV-BACKUP (only if SAAS-BACKUP candidate does not promote) | AvePoint Cloud Backup, Veeam Backup for Microsoft 365, Druva for M365, Spanning, Keepit, HYCU, Barracuda Cloud-to-Cloud. Hard dependency on the SAAS-BACKUP triage outcome (queued mention_count=1). If SAAS-BACKUP promotes, this triplet moves there and `COLLAB-GOV-BACKUP` capability + module demote. |
| B3-7 | `migration_projects` + `migration_jobs` + `content_mappings` + `migration_validations` | COLLAB-GOV-MIGRATE (only if TENANT-MIGRATION candidate does not promote) | ShareGate Migrate, AvePoint Fly, Quest On Demand Migration, BitTitan MigrationWiz, CloudM Migrate. Hard dependency on the TENANT-MIGRATION triage outcome (queued mention_count=1). If TENANT-MIGRATION promotes, this set moves there. |
| B3-8 | `delegated_admin_assignments` + `tenant_health_indicators` + `license_usage_snapshots` | (cross-cutting; possibly M365-MGMT if that candidate promotes) | CoreView, ENow Application Insights, Quest On Demand. Hard dependency on the M365-MGMT triage outcome (queued mention_count=1). If M365-MGMT promotes, the delegated-admin axis moves there; COLLAB-GOV keeps only the lifecycle / sharing / permissions axes. |

### Cross-bucket dependencies

- **Bucket 2 item 1 gates every Bucket 3 item.** If leadership-tier, all 8 Bucket 3 items are dropped (no masters to author).
- **Bucket 2 item 1 also gates Bucket 2 item 5** (modularization shape is irrelevant on the leadership-tier route).
- **Bucket 2 item 6 depends on Bucket 2 item 1 + the SAAS-BACKUP candidate triage** in `_missing-domains.md` (mention_count=1 today; vendor evidence is strong enough that promotion looks plausible).
- **Bucket 2 item 7 depends on Bucket 2 item 1 + the TENANT-MIGRATION candidate triage** (similarly mention_count=1).
- **Bucket 2 item 3** (Security vs End-User Computing ownership) interacts with Bucket 2 item 5 modularization: if Security owns COLLAB-GOV-PERMS and COLLAB-GOV-EXTSHARE, those modules may sit under Security's role naming rather than End-User Computing's. Resolve item 3 before authoring roles on the real-market route.
- **B3-3 has dual-master tension with IGA** (`access_reviews`). Resolve at Phase 0 vendor-research time; the answer may be that COLLAB-GOV's reviews are scoped to workspace-access and IGA's are scoped to role-access (same shape, different scope, two separate masters).
- **B3-4 has dual-master tension with DLP** (`external_sharing_policies` vs DLP's sensitive-content rules). Resolve at Phase 0 vendor-research time.
- **B3-6 and B3-7 depend on SAAS-BACKUP and TENANT-MIGRATION promotion decisions respectively.**
- **B3-8 depends on M365-MGMT promotion decision.**
- Bucket 1 B1-S1 (catalog UX text) depends on Bucket 2 item 2 (which is itself the approval of the B1-S1 draft text). They are the same decision viewed from two angles.

### Per-bucket prompts

- **After Bucket 1:** "Approve the proposed `catalog_tagline` + `catalog_description` text for COLLAB-GOV, or rewrite either / both. Reply with the exact wording per Rule #20. (Or wait until Bucket 2 item 1 is settled, since the buyer voice depends on the classification.)"
- **After Bucket 2:** "Pick one for item 1: (a) confirm leadership-tier (M1 fix is one landing module, no Phase B), (b) flip to real point-solution market (run Phase 0 vendor research from Bucket 3, then load Phase A / M / B / C / E / F / H), or (c) hybrid (leadership-tier landing module + a starter for the inventory + permissions-audit minimum). Then answer items 2-8 in order: catalog UX wording, business-function ownership shift, regulation set, modularization shape (only if (b) or (c)), SAAS-BACKUP collision, TENANT-MIGRATION collision, alias set."
- **After Bucket 3:** "If you picked (b) or (c) on Bucket 2 item 1, choose the verification route: vetted Phase 0 vendor research subagent now, OR eyeball-mode (you call out which B3-1 through B3-8 candidates ring true and they become Bucket 1 items in the follow-up audit). Note B3-3 (access_reviews) and B3-4 (external_sharing_policies) carry dual-master tension with IGA and DLP respectively, resolve at Phase 0."

### Report-only follow-ups (owed by other domains)

Because COLLAB-GOV currently masters nothing and authors no handoffs, every potential cross-domain edge is owed by the partner domain's next B9 / B8 pass. These rows are informational only on this audit:

- **DLP B9 candidate (id 139):** `dlp_incident.external_share_violation_detected` -> COLLAB-GOV-EXTSHARE (governance-side remediation workflow). Only meaningful if Bucket 2 item 1 flips COLLAB-GOV to real-market and B3-4 (`external_sharing_policies`) lands.
- **DSPM B9 candidate (id 140):** `data_asset.risk_score_elevated` -> COLLAB-GOV (permissions-audit remediation queue); `sensitive_data_incident.detected` on collaboration-resident data -> COLLAB-GOV-PERMS. Same condition.
- **IGA B9 candidate (id 35):** `access_review.due` or `group_membership.drift_detected` -> COLLAB-GOV-PERMS attestation queue. Same condition.
- **ECM B9 candidate (id 91):** `site.provisioned` or `library.created` -> COLLAB-GOV-INVENTORY (workspace inventory update). Parent-child handoff; the structural question is whether COLLAB-GOV consumes ECM events or whether COLLAB-GOV inventory IS ECM's inventory view (Bucket 2 item 1 affects this).
- **WSC B9 candidate (id 75):** `chat_workspace.created` or `channel.external_access_changed` -> COLLAB-GOV-INVENTORY / -EXTSHARE. Same condition.
- **UEM B9 candidate (id 86):** `device.compliance_violation` on a device accessing collaboration resources -> COLLAB-GOV (conditional access intersection). Light-priority.
- **SECOPS B9 candidate (id 11):** `permission_audit_finding.escalated` reverse direction (COLLAB-GOV publishes; SECOPS consumes); if COLLAB-GOV stays leadership-tier this never materializes from this side. Same condition.
- **ITSM B9 candidate:** `access_request.approved` or `workspace_provisioning_request.completed` -> COLLAB-GOV-LIFECYCLE provisioning queue. Same condition.

Surface each of the above on the respective partner domain's next b1 audit; none are loadable from COLLAB-GOV's side (COLLAB-GOV is the consumer / target on each).

### Candidate domains queued during this audit

Routed to `audits/_missing-domains.md` via `scripts/analytics/append_missing_domain.ts`:

| Candidate code | Action | New mention_count |
|---|---|---|
| SAAS-BACKUP | New entry (Veeam Backup for Microsoft 365, AvePoint Cloud Backup, Druva, Spanning, Keepit, HYCU, Barracuda) | 1 |
| TENANT-MIGRATION | New entry (ShareGate Migrate, AvePoint Fly, Quest On Demand Migration, BitTitan MigrationWiz, CloudM Migrate) | 1 |
| M365-MGMT | New entry (CoreView, ENow Application Insights, Quest On Demand, ManageEngine M365 Manager Plus, AdminDroid) | 1 |

SAAS-BACKUP and TENANT-MIGRATION at mention_count=1 are new today but the vendor evidence is strong (each candidate has 4+ pure-play specialists with no collaboration-governance offering of their own). M365-MGMT is more borderline (CoreView and Quest also play in COLLAB-GOV); user triage decides whether it folds into COLLAB-GOV or becomes its own market.

## 2026-05-31, Audit

### Summary

- Re-run of the structural Validate b1 audit. State is unchanged from 2026-05-30: the COLLAB-GOV `domains` row (id 127, parent_domain_id 91 = ECM) remains headless. Zero `domain_modules`, zero `domain_module_host_domains`, zero `domain_data_objects`, zero `handoffs` (outbound or inbound), zero `skills`, zero `trigger_events` (per-module scope, nothing to scope against), zero `domain_regulations`, zero `domain_aliases`, zero sub-domains. Confirmed live: 7 `capability_domains` rows (COLLAB-GOV-INVENTORY, -LIFECYCLE, -PERMS, -EXTSHARE, -STALE, -BACKUP, -MIGRATE), 11 `solution_domains` rows (10 primary + 1 partial), 2 `business_function_domains` rows (End-User Computing owner, Security contributor).
- No fixes were applied on 2026-05-30 (`b1a` was empty in the carry-over state, Bucket 2 item 1 still gates everything substantive). The findings carry forward verbatim with no resolution.
- Bucket 1 (in-scope, agent fixable): 1 item (catalog UX text draft, gated by Bucket 2 item 2 approval per Rule #20).
- Bucket 2 (surface-for-user, judgment): 8 items (classification, catalog UX wording, BF ownership, regulations, modularization, SAAS-BACKUP collision, TENANT-MIGRATION collision, aliases).
- Bucket 3 (Phase 0 pending, speculative): 8 candidate master groups, all conditional on Bucket 2 item 1 picking the real-market route.

### Per-band reconfirmation

| Band | Result | Evidence |
|---|---|---|
| A1 (domains metadata) | PASS | crud_percentage=80, business_logic populated, min_org_size='30 m <2500', cost_band='$$', usa_market_size_usd_m=800, market_size_source_year=2024, certification_required=false. |
| A2 (capabilities) | PASS | 7 linked capabilities (above the 3-row floor). Note: 7 capabilities makes Rule #14's ">=3 capabilities needs >=2 modules" applicable on the real-market route. |
| A3 (solutions) | PASS | 11 solutions linked, 10 primary + 1 partial. |
| A4 (catalog UX fields) | FAIL | catalog_tagline='' and catalog_description=''. Carries B1-S1 forward. |
| M1 (>=1 module) | FAIL (or PASS by leadership-tier carve-out) | 0 modules. SKILL.md line 797 lists COLLAB-GOV in the leadership-tier exception set; SKILL.md line 243 says the M1 floor is unconditional. Until Bucket 2 item 1 settles, both readings stay open. |
| M2 / M4 / M5 / M6 / M7 | N/A | gated on M1. |
| B1 (>=1 master) | PASS-by-leadership-tier-exception | conditional on Bucket 2 item 1. |
| B5 (embedded_master integrity) | N/A | no `embedded_master` rows to validate. |
| B7 (users edges) | N/A | no data_objects mastered, no relationships to author. |
| B9 (outbound trigger_events + handoffs) | FAIL (on real-market route) / VACUOUS (on leadership route) | 0 trigger_events, 0 outbound handoffs. |
| B9b (intra-domain cross-module handoffs) | N/A | requires >=2 modules. |
| B10b (per-module attribution on handoffs) | N/A | no handoffs in scope. |
| B11 (data_object_aliases) | N/A | no masters. |
| B12 (lifecycle states + pattern flags) | N/A | no masters. |
| C1 (business_function owner) | PASS | 1 owner (End-User Computing) + 1 contributor (Security). Bucket 2 item 3 questions whether Security should be owner instead. |
| C2 (BF-capability overrides) | PASS-by-allowance | no overrides loaded; Bucket 2 item 3 may add some. |
| D1 (UI spot-check) | DEFERRED | nothing loaded since prior audit. |
| E1-E5 (roles) | N/A | no modules to bundle. |
| F1-F5 (skill layer) | DEFERRED | F2 / F3 / F5 inapplicable until M1 resolves. SKILL.md line 1583 waives system-skill creation for leadership-tier domains. |
| H1 (APQC tagging on cross-domain handoffs) | VACUOUSLY PASS | zero cross-domain handoffs. |

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `catalog_tagline` and `catalog_description` are empty on the domains row. Rule #20 requires both, buyer voice (workflow + value), surfaced for explicit user approval before write. | Draft surfaced 2026-05-30, awaiting Bucket 2 item 2 approval. Drafts: catalog_tagline = "Inventory every workspace, enforce sharing policies, and clean up sprawl across your collaboration tenant." catalog_description = "Discover every team site, channel, file-sync drive, and group container in your collaboration tenant. Run permission audits and external-share reviews on a schedule, archive workspaces that have gone stale, and automate provisioning so new workspaces ship with the right ownership and retention policy from day one. Catch oversharing before it becomes a data incident, surface broken or duplicated permission inheritance, and give business owners a path to attest to access without an IT ticket." Note: if Bucket 2 item 1 picks leadership-tier, the buyer voice should pivot from "M365 governance product" to "collaboration-governance signal layer", which would require rewritten drafts. |

MISSING, WRONG-OWNERSHIP, SCOPE-CREEP, BOUNDARY, APQC TAGGING: zero (same as 2026-05-30; gated on Bucket 2 item 1).

### Bucket 2, Surface-for-user (judgment calls), carried forward verbatim from 2026-05-30

1. **Classification: leadership-tier vs real point-solution market.** SKILL.md line 797 lists COLLAB-GOV in the leadership-tier exception set (expected zero masters, no system skill). The vendor surface (AvePoint Confidence Platform, ShareGate, Syskit Point, CoreView, Rencore Governance, Orchestry) is a real software market. Options: (a) confirm leadership-tier (add 1 landing module to satisfy Rule #14 M1, B / E / F / H pass by exception); (b) flip to real point-solution market (run Phase 0 from Bucket 3, then Phase A / M / B / C / E / F / H); (c) hybrid (leadership-tier landing module + a `module_kind='starter'`). **Gates Bucket 3 entirely.**
2. **Catalog UX text approval.** Approve / edit / reject the B1-S1 drafts. Independent of item 1 except for the voice pivot if (a) is picked.
3. **Business-function ownership shift.** COLLAB-GOV-PERMS, COLLAB-GOV-EXTSHARE, and arguably COLLAB-GOV-STALE are Security-leaning. Options: (a) flip Security to owner and End-User Computing to contributor, (b) keep End-User Computing as owner and add `business_function_capabilities` overrides for the three Security-leaning capabilities, (c) leave as is.
4. **Regulations scope.** `domain_regulations` empty. Candidates: GDPR (Articles 5 / 30 / 32), CCPA, SOX (records retention on financial libraries), HIPAA (sensitive-content controls), eDiscovery / FRCP. Decide which to attach at applicability='mandatory' or 'recommended'.
5. **Modularization (only on real-market route).** Proposed 4-module split: COLLAB-GOV-INVENTORY, COLLAB-GOV-LIFECYCLE, COLLAB-GOV-PERMS, COLLAB-GOV-STALE. COLLAB-GOV-BACKUP / COLLAB-GOV-MIGRATE either fold into LIFECYCLE or get promoted out to SAAS-BACKUP / TENANT-MIGRATION.
6. **COLLAB-GOV-BACKUP capability vs SAAS-BACKUP candidate** (mention_count=1). If SAAS-BACKUP promotes, COLLAB-GOV-BACKUP capability demotes (move to SAAS-BACKUP or stays as partial-overlap link).
7. **COLLAB-GOV-MIGRATE capability vs TENANT-MIGRATION candidate** (mention_count=1). Same shape as item 6 but for migration.
8. **`domain_aliases` empty.** Candidates: microsoft 365 governance, m365 management, sharepoint governance, teams governance, tenant administration, workspace governance, collaboration sprawl management. Decide which to load and which `alias_type` each is.

### Bucket 3, Phase 0 pending (speculative), carried forward verbatim from 2026-05-30

Eight candidate master groups, all keyed against the Bucket 2 item 1 real-market branch. If leadership-tier is picked, every Bucket 3 item is dropped wholesale.

| # | Candidate | Proposed module | Vendor evidence basis |
|---|---|---|---|
| B3-1 | `collaboration_workspaces` (or `tenant_workspaces`) + `workspace_owners` + `workspace_membership` | COLLAB-GOV-INVENTORY | Universal (AvePoint Confidence, ShareGate, Syskit Point, CoreView, Orchestry). |
| B3-2 | `workspace_lifecycle_policies` + `provisioning_templates` + `workspace_archive_actions` | COLLAB-GOV-LIFECYCLE | Universal (Orchestry, ProvisionPoint 365, AvePoint Maestro). |
| B3-3 | `permissions_audits` + `permission_findings` + `access_reviews` + `attestation_responses` | COLLAB-GOV-PERMS | Universal (AvePoint Policies, ShareGate Protect, Syskit Point access-review). Dual-master tension with IGA on `access_reviews`. |
| B3-4 | `external_sharing_policies` + `external_share_links` + `guest_users` | COLLAB-GOV-EXTSHARE | Common (AvePoint Cloud Governance, ShareGate Protect, Syskit, Rencore). Dual-master tension with DLP. |
| B3-5 | `stale_content_signals` + `archive_recommendations` + `remediation_actions` | COLLAB-GOV-STALE | Universal but thinly modeled. Possibly `derived` rather than `master`. |
| B3-6 | `m365_backup_jobs` + `backup_recovery_points` + `restore_operations` | COLLAB-GOV-BACKUP (only if SAAS-BACKUP does not promote) | AvePoint Cloud Backup, Veeam Backup for Microsoft 365, Druva for M365, Spanning, Keepit, HYCU, Barracuda. |
| B3-7 | `migration_projects` + `migration_jobs` + `content_mappings` + `migration_validations` | COLLAB-GOV-MIGRATE (only if TENANT-MIGRATION does not promote) | ShareGate Migrate, AvePoint Fly, Quest On Demand Migration, BitTitan MigrationWiz, CloudM Migrate. |
| B3-8 | `delegated_admin_assignments` + `tenant_health_indicators` + `license_usage_snapshots` | (cross-cutting; possibly M365-MGMT if that candidate promotes) | CoreView, ENow Application Insights, Quest On Demand. |

### Cross-bucket dependencies

- Bucket 2 item 1 gates every Bucket 3 item.
- Bucket 2 item 1 gates Bucket 2 item 5 (modularization).
- Bucket 2 item 6 depends on Bucket 2 item 1 + SAAS-BACKUP triage in `_missing-domains.md`.
- Bucket 2 item 7 depends on Bucket 2 item 1 + TENANT-MIGRATION triage.
- Bucket 2 item 3 (Security vs End-User Computing) interacts with Bucket 2 item 5 modularization.
- B3-3 has dual-master tension with IGA on `access_reviews`.
- B3-4 has dual-master tension with DLP on `external_sharing_policies`.
- B1-S1 depends on Bucket 2 item 2 (same decision, two angles).

### Per-bucket prompts

- **After Bucket 1:** "Approve the proposed catalog_tagline + catalog_description text for COLLAB-GOV, or rewrite either / both. (Or wait until Bucket 2 item 1 settles, since voice depends on classification.)"
- **After Bucket 2:** "Pick one for item 1: (a) leadership-tier (1 landing module, no Phase B), (b) real point-solution market (Phase 0 + Phase A / M / B / C / E / F / H), or (c) hybrid. Then answer items 2-8 in order."
- **After Bucket 3:** "If (b) or (c) on Bucket 2 item 1, choose verification route: vetted Phase 0 vendor research, OR eyeball-mode. Note B3-3 and B3-4 carry dual-master tension."

### Decisions

None this run; all 2026-05-30 findings carry forward without user action.

### Fixes applied

None.

### Report-only follow-ups (owed by other domains)

Same set as 2026-05-30 (DLP, DSPM, IGA, ECM, WSC, UEM, SECOPS, ITSM). All conditional on Bucket 2 item 1 picking the real-market route. No new partner-side findings discovered this audit.

### JWT-audience errors

None.

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate execute over the open items in `state.yaml` (no fresh from-scratch audit). Live re-verification confirmed the snapshot: COLLAB-GOV `domains` row id 127 (parent 91 = ECM, `record_status='new'`) with `catalog_tagline=''` and `catalog_description=''`, 0 `domain_modules` (M1 hard fail, UNBUILT), 7 `capability_domains`, 0 masters, 0 `domain_aliases`, 0 `domain_regulations`, and 2 `business_function_domains` rows (owner = End-User Computing `business_function_id` 59, contributor = Security `business_function_id` 28). The domain `description` is an unambiguous real-market buyer voice ("Buyer is the collaboration-platform administrator (IT operations)"), and B1A-RECLASS already settled (2026-06-02) that the leadership-tier zero-master exemption was rescinded and the domain is master-bearing. That makes the catalog UX "surface-before-write" gate (B1B-S1 / B2-2) stale and the leadership-tier "signal layer" voice pivot moot, so the catalog text was written this pass.

Because the domain is UNBUILT (0 modules / 0 masters), the build cascade is surfaced, not scaffolded: no modules, masters, roles, or skills were authored.

### Executed (record_status='new'; idempotent; verified live)

- **Catalog UX (Rule #20)** - 1 `domains` row PATCHed (id 127): `catalog_tagline` and `catalog_description` written from the history.md B1-S1 drafts (buyer voice, workflow + value, no vendor names, no em-dash, American English). Empty-only write; no non-empty value overwritten. Retires B1B-S1 / B2-2.
- **Aliases (B11)** - 3 `domain_aliases` rows INSERTED (`alias_type='synonym'`, `record_status='new'`): "tenant administration", "workspace governance", "collaboration sprawl management". Only the clearly-generic, non-vendor candidates were loaded; the 4 product-named B2-8 candidates were held back under Rule #18 and surfaced for explicit approval.

Loader: `.tmp_deploy/2026-06-07_collab_gov_state_driven_execute.ts`.

### Surfaced (for user; not written)

- **B2-1 (build scope, reframed):** classification already settled master-bearing; open decision is the BUILD shape: (a) full real-market stack (Phase 0 + Phase A/M/B/C/E/F/H), or (b) minimal starter first. Gates b3 and B2-5.
- **B2-3 (DESTRUCTIVE):** flip Security to owner / End-User Computing to contributor on `business_function_domains` overwrites a non-empty `responsibility_type`. Recommended only; not applied. Additive alternative (b) = `business_function_capabilities` overrides for COLLAB-GOV-PERMS / -EXTSHARE / -STALE, loadable once the user picks it.
- **B2-4 (regulations):** `domain_regulations` empty; which of GDPR / CCPA / SOX / HIPAA / eDiscovery-FRCP at which applicability. `certification_required` stays false. Judgment call.
- **B2-5 (modularization):** default 4-module split (COLLAB-GOV-INVENTORY / -LIFECYCLE / -PERMS / -STALE) vs 5/7-module alternatives. Gated on B2-1.
- **B2-6 (SAAS-BACKUP collision):** promote SAAS-BACKUP and move/demote COLLAB-GOV-BACKUP capability, or keep it under COLLAB-GOV.
- **B2-7 (TENANT-MIGRATION collision):** promote TENANT-MIGRATION and move/demote COLLAB-GOV-MIGRATE capability, or keep it.
- **B2-8 (remaining aliases):** load the 4 vendor/product-named search aliases (microsoft 365 governance, m365 management, sharepoint governance, teams governance)? Held back under Rule #18.

### Left (untouched)

- **b1a / b1b build cascade:** B1A-BUILD + B1B-M1 / B1B-B-BAND / B1B-E-BAND / B1B-F-BAND all blocked on the build (0 modules) and on user decisions B2-1 / B2-5. UNBUILT clause: do not scaffold; surface the build; leave the cascade.
- **B1B-F-BAND reframed as a note:** the per-module system-skill grain is RETIRED (superseded 2026-06-06). The current model gives COLLAB-GOV exactly ONE domain-grain `system` skill after the build, deriving its toolset; FULL modules carry no skill; tool requirements live on `domain_module_tools`. No per-module skill work.
- **b3 (B3-1 .. B3-8):** all 8 candidate master groups remain backlog, gated on the B2-1 real-market build route. Not authored.
- **entity_type / APQC H1 / C1:** N/A this pass (0 masters to classify, 0 handoffs to tag, business_function_domains owner+contributor already present).

### Decisions

None this run beyond confirming B1A-RECLASS settled (master-bearing).

### Fixes applied

Catalog UX text (1 PATCH) + 3 generic aliases (see Executed).

### UI links (tables written)

- https://tests.semantius.app/domain_map/domains?id=eq.127
- https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.127

### JWT-audience errors

None.

## 2026-06-13 - Audit (review/execute pass)

### Summary

State-driven review of the open items in state.yaml. Live re-verification confirmed the snapshot unchanged: COLLAB-GOV domains row id 127 (parent 91 = ECM, record_status='new'), all 7 metadata fields populated, catalog UX text present (written 2026-06-07), 0 domain_modules (M1 fail, UNBUILT), 7 capability_domains, 0 masters, 3 domain_aliases (generic synonyms, record_status='new'), 0 domain_regulations, 2 business_function_domains (owner = End-User Computing 59, contributor = Security 28), 0 handoffs (outbound and inbound), 0 skills.

The one agent-actionable b1a item this pass was B1A-B9D-VERIFY.

### Executed

- **B9d (handoff payload realization), BOTH directions** - ran `scripts/analytics/b9d_resolver.ts COLLAB-GOV --dry-run`. Result: 0 boundary tags, 0 distinct (process, owner) findings, empty verdicts. COLLAB-GOV authors zero handoffs in either direction, so there are no payloads to classify, re-point, or route to owners. B9d is verified clean vacuously in both directions. **B1A-B9D-VERIFY RESOLVED** and removed from state.yaml.
- **Phase 0 vendor surface (Rule #22 forcing step)** - confirmed `.tmp_deploy/COLLAB-GOV-phase0-2026-06-13.md` is current; it names six flagship pure-play governance vendors (AvePoint, ShareGate, Syskit Point, CoreView, Orchestry, Rencore), gives a vendor-by-entity surface matrix, and carries per-decision verdicts for B2-1 / B2-5 / B2-6 / B2-7 plus the M365-MGMT note. The market-shape recommendations in the q-file are grounded in this evidence (full build, 4-module split, promote SAAS-BACKUP, promote TENANT-MIGRATION).
- **q-COLLAB-GOV.md** - confirmed current and Rule #22-conformant: 7 blocking questions (q1 gate marked "answer this first") covering B2-1/B2-3/B2-4/B2-5/B2-6/B2-7/B2-8 plus 1 optional b3 question (q8), each with vendor-grounded Recommended lines, yes/no or pick-one shape, and an accurate agent-map footer. No em-dashes, American English.

### Left (untouched; gated on the user)

- **b2 (B2-1, B2-3, B2-4, B2-5, B2-6, B2-7, B2-8)** - all surfaced in the q-file. B2-1 (build shape) is the gate. B2-3 is the destructive owner flip (surfaced, not applied). The full UNBUILT build cascade (B1A-BUILD + b1b M1/B-band/E-band/F-band) stays gated on B2-1/B2-5 per the UNBUILT clause: surface the build, do not scaffold.
- **b3 (B3-1 .. B3-8)** - candidate master groups remain backlog, surfaced as the single optional q8; gated on the B2-1 real-market route.

### Fixes applied

B9d verification (read-only resolver, 0 findings). No catalog rows written this pass. No record_status changes.

### Final state

status: feedback_needed, next_action_by: user. q-COLLAB-GOV.md is the current human-readable projection.

### Git

Zero git write commands run this pass (read-only review + audit-file edits only).

### JWT-audience errors

None.

