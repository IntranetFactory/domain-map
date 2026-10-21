# COLLAB-GOV Phase 0 - Vendor Surface

Domain: Collaboration Governance (id 127). Market: governance, lifecycle, permission audit, external-sharing control, and sprawl remediation across Microsoft 365 / SharePoint / Teams / Groups (and adjacent collaboration suites). Produced 2026-06-13 to back the market-shape b2 decisions (B2-1 build scope, B2-5 split, B2-6 backup, B2-7 migration) per Rule #22, before the q-file is surfaced. crud_percentage 80, cost_band $$, min_org_size 30 m <2500, US TAM ~$800M (2024).

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| AvePoint Confidence Platform | avepoint.com | Full-suite M365 governance (Cloud Governance, Policies, Insights, MyHub, Opus lifecycle) | Broadest pure-play surface; models inventory + lifecycle + policy + permission + external-share + backup + migration |
| ShareGate | sharegate.com | Permission management, provisioning, migration | Pure-play; strong on permission audit, external-sharing reports, and migration (ShareGate Migrate) |
| Syskit Point | syskit.com | Inventory, access reviews, lifecycle, reporting | Pure-play governance; clean inventory + scheduled access-review + attestation model |
| CoreView | coreview.com | M365 tenant management, delegated admin, license optimization | Tenant-admin / delegated-admin axis + policy enforcement; reveals the M365-MGMT overlap |
| Orchestry | orchestry.com | Provisioning templates, lifecycle automation, archival | Lifecycle / provisioning-template specialist; archival + workspace-directory model |
| Rencore Governance | rencore.com | Policy-as-code governance, external-sharing oversight | Policy + external-sharing specialist; corroborates the EXTSHARE entity set |

Suite reference (not counted as a flagship, used only to confirm mainline shape): Microsoft Purview (Information Protection, eDiscovery, Data Lifecycle Management) and native M365 Groups expiration / sensitivity labels.

## Surface matrix

V1 AvePoint · V2 ShareGate · V3 Syskit Point · V4 CoreView · V5 Orchestry · V6 Rencore

| Entity | Category | V1 | V2 | V3 | V4 | V5 | V6 | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| collaboration_workspaces | Master | x | x | x | x | x | x | Core | COLLAB-GOV-INVENTORY |
| workspace_owners | Master/junction | x | x | x | x | x | x | Core | COLLAB-GOV-INVENTORY |
| workspace_memberships | Junction | x | x | x | x | x | x | Core | COLLAB-GOV-INVENTORY |
| workspace_inventory_snapshots | Audit | x |   | x | x |   | x | Core | COLLAB-GOV-INVENTORY |
| workspace_lifecycle_policies | Master | x |   | x |   | x | x | Core | COLLAB-GOV-LIFECYCLE |
| provisioning_templates | Config/template | x | x | x |   | x |   | Core | COLLAB-GOV-LIFECYCLE |
| provisioning_requests | Master (workflow) | x | x |   |   | x |   | Common | COLLAB-GOV-LIFECYCLE |
| workspace_archive_actions | Master (workflow) | x |   | x |   | x |   | Core | COLLAB-GOV-LIFECYCLE |
| retention_policies | Master | x |   |   |   |   | x | Common | COLLAB-GOV-LIFECYCLE |
| permission_audits | Master (workflow) | x | x | x |   |   | x | Core | COLLAB-GOV-PERMS |
| permission_findings | Master | x | x | x |   |   | x | Core | COLLAB-GOV-PERMS |
| access_reviews | Master (workflow) | x | x | x | x |   |   | Core | COLLAB-GOV-PERMS |
| attestation_responses | Junction (workflow) | x |   | x | x |   |   | Core | COLLAB-GOV-PERMS |
| external_sharing_policies | Master | x | x | x |   |   | x | Core | COLLAB-GOV-PERMS (or -EXTSHARE) |
| external_share_links | Master (workflow) | x | x | x |   |   | x | Core | COLLAB-GOV-PERMS (or -EXTSHARE) |
| guest_users | Master | x | x | x | x |   | x | Core | COLLAB-GOV-PERMS (or -EXTSHARE) |
| stale_content_signals | Derived/master | x |   | x |   | x |   | Common | COLLAB-GOV-STALE |
| archive_recommendations | Derived | x |   | x |   | x |   | Common | COLLAB-GOV-STALE |
| remediation_actions | Master (workflow) | x |   | x |   | x |   | Common | COLLAB-GOV-STALE |
| sensitivity_labels | Config (consumer) | x |   |   |   |   | x | Common | consumer of Purview / DLP |
| m365_backup_jobs | Master (workflow) | x |   |   |   |   |   | Specialist | COLLAB-GOV-BACKUP or SAAS-BACKUP |
| backup_recovery_points | Master | x |   |   |   |   |   | Specialist | COLLAB-GOV-BACKUP or SAAS-BACKUP |
| restore_operations | Master (workflow) | x |   |   |   |   |   | Specialist | COLLAB-GOV-BACKUP or SAAS-BACKUP |
| migration_projects | Master (workflow) | x | x |   |   |   |   | Common | COLLAB-GOV-MIGRATE or TENANT-MIGRATION |
| migration_jobs | Master (workflow) | x | x |   |   |   |   | Common | COLLAB-GOV-MIGRATE or TENANT-MIGRATION |
| content_mappings | Junction | x | x |   |   |   |   | Common | COLLAB-GOV-MIGRATE or TENANT-MIGRATION |
| migration_validations | Audit | x | x |   |   |   |   | Common | COLLAB-GOV-MIGRATE or TENANT-MIGRATION |
| delegated_admin_assignments | Master | x |   |   | x |   |   | Common | cross-cutting / M365-MGMT |
| tenant_health_indicators | Derived | x |   | x | x |   |   | Common | cross-cutting / M365-MGMT |
| license_usage_snapshots | Audit/derived |   |   |   | x |   |   | Specialist | cross-cutting / M365-MGMT |

## Compliance entities (market-driven)

Collaboration governance is governed indirectly: it enforces data-protection, retention, and access-accountability requirements rather than mastering statute-specific filing records. No statute-prefixed master is structurally required (certification_required stays false). The relevant frameworks attach as `domain_regulations`, not as masters:

| Framework | How it lands | Note |
| --- | --- | --- |
| GDPR (Art. 5 / 30 / 32) | `domain_regulations` (mandatory) | Data-protection accountability, processing inventory, access controls over collaboration data |
| SOX | `domain_regulations` (recommended) | Records retention on financial document libraries |
| HIPAA | `domain_regulations` (recommended, healthcare orgs) | Sensitive-content controls |
| eDiscovery / FRCP | `domain_regulations` (recommended) | Legal-hold integration (Purview eDiscovery) |
| CCPA | `domain_regulations` (optional) | Consumer-data inventory/access |

No FCRA / FDA Part 11 / PCI / KYC-AML entities in scope.

## Per-decision verdicts (what the q-file recommendations must cite)

- **B2-1 build scope.** All six flagship vendors are pure-play collaboration-governance suites with independent commerce (AvePoint, ShareGate, Syskit, CoreView, Orchestry, Rencore). The market is real and master-bearing (B1A-RECLASS settled). Verdict: **build the full real-market stack (option a)**. A minimal starter (option b) would ship INVENTORY + PERMS and defer LIFECYCLE / STALE / EXTSHARE, which every flagship models as mainline, so the starter would under-represent the market.
- **B2-5 module split.** Core entities cluster cleanly into four groups: inventory (workspaces + owners + memberships + snapshots), lifecycle (policies + templates + provisioning + archive + retention), permissions (audits + findings + access-reviews + attestations + the external-sharing trio), and stale (signals + recommendations + remediation). All six vendors present permission audit and external-sharing together (ShareGate Protect, AvePoint Policies, Rencore all bundle them), so **the 4-module split (option a)** matches vendor packaging better than splitting EXTSHARE out (option c) or one-module-per-capability (option b). 7 capabilities -> Rule #14 M2 requires >=2 full modules; 4 satisfies that with no sprawl.
- **B2-6 backup.** Backup is Specialist on this surface: ONLY AvePoint (V1) models m365_backup_jobs / recovery_points / restore_operations, and it does so via a separate product (AvePoint Cloud Backup), not its governance suite. The pure-play backup market (Veeam Backup for M365, Druva, Spanning, Keepit, HYCU, Barracuda Cloud-to-Cloud) sells independently and several have NO governance offering. Verdict: **promote SAAS-BACKUP and move the backup capability+masters to it (option a)**.
- **B2-7 migration.** Migration is Common here (AvePoint Fly + ShareGate Migrate model it) but is dominated by pure-play migration tools (ShareGate Migrate, AvePoint Fly, Quest On Demand Migration, BitTitan MigrationWiz, CloudM Migrate) bought separately, especially for M&A. Verdict: **promote TENANT-MIGRATION and move the migration capability+masters to it (option a)**.
- **B3-8 / M365-MGMT.** delegated_admin / tenant_health / license_usage are tenant-administration masters surfaced mainly by CoreView (and partly AvePoint Insights). They are cross-cutting tenant-management, not collaboration-governance. If M365-MGMT promotes, this axis moves there; COLLAB-GOV keeps inventory / lifecycle / permissions / external-sharing / stale. Non-blocking (queued mention_count=1).

## Modularization hypothesis (subtraction list for Phase A/B)

Four full modules: **COLLAB-GOV-INVENTORY** (the workspace inventory + ownership/membership graph + periodic snapshots; the entity the rest hang off), **COLLAB-GOV-LIFECYCLE** (provisioning templates + requests, lifecycle policies, archive actions, retention), **COLLAB-GOV-PERMS** (permission audits + findings, access reviews + attestations, and the external-sharing policies/links/guest-users trio), **COLLAB-GOV-STALE** (stale-content signals, archive recommendations, remediation actions; STALE may carry mostly derived rows + one remediation workflow master). Backup and migration leave the domain to SAAS-BACKUP / TENANT-MIGRATION respectively. The delegated-admin axis is deferred to M365-MGMT. Every Core/Common entity above gets a master or consumer/derived row in its named module; sensitivity_labels lands as a consumer of Purview/DLP, not a master.
