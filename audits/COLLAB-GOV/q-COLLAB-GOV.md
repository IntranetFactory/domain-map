# Collaboration Governance (COLLAB-GOV): questions waiting for you

## What this domain is
Inventory every workspace, enforce sharing policies, and clean up sprawl across your collaboration tenant.

Discover every team site, channel, file-sync drive, and group container in your collaboration tenant. Run permission audits and external-share reviews on a schedule, archive workspaces that have gone stale, and automate provisioning so new workspaces ship with the right ownership and retention policy from day one. Catch oversharing before it becomes a data incident, surface broken or duplicated permission inheritance, and give business owners a path to attest to access without an IT ticket.

---

q1: (answer this first) The classification is already settled (this is a real, master-bearing collaboration-governance market, not a leadership-tier read-only domain). What build shape should it get?

- a) Build the full real-market stack: research the candidate masters first, then load the modules, masters, capabilities, roles, and skill for the module split chosen below.
- b) Build a minimal starter first (one full inventory module plus one starter permissions-audit module), and defer lifecycle, stale-content, and external-sharing to a later pass.

Recommended: a. The eleven linked specialist products (AvePoint, ShareGate, Syskit Point, CoreView, Rencore, Orchestry and more) are pure-play governance suites with their own commerce, so the full build matches the real market. This choice gates the module split and every candidate master below it, so it unlocks the rest of the build.

a1:

---

q2: Three of the seven capabilities (permissions audit, external-sharing controls, and arguably stale-content) are often Security-owned in regulated orgs. Today the owner is End-User Computing and Security is only a contributor. How should ownership be handled?

- a) Flip Security to owner and End-User Computing to contributor (this overwrites the current owner, so it needs your sign-off).
- b) Keep End-User Computing as owner and add per-capability overrides so the three Security-leaning capabilities point at Security (additive, no overwrite).
- c) Leave it as is.

Recommended: b. The override route gives Security the capabilities that are genuinely its mandate without overwriting the existing owner. Pick (a) only if you want Security to own the whole domain, which is a destructive change to the current value.

a2:

---

q3: No regulations are attached yet. Which should be tagged onto Collaboration Governance, and at what weight?

- a) GDPR (data-protection accountability for processing records and security controls)
- b) CCPA (consumer data inventory and access controls)
- c) SOX (records retention on financial libraries)
- d) HIPAA (sensitive-content controls in healthcare orgs)
- e) eDiscovery / FRCP (legal-hold and eDiscovery integration)
- f) none

Recommended: a (GDPR), as mandatory. GDPR clearly applies to collaboration data and access governance; add SOX or HIPAA only if you run financial or healthcare content libraries. None of these block certification, so this does not hold up the build.

a3:

---

q4: How should Collaboration Governance be split into modules (the sub-areas of the product)?

- a) Four modules: Inventory (workspace inventory and ownership inference); Lifecycle (provisioning, archive, retention policy); Permissions (permission audit, access reviews, external-sharing controls); Stale (stale-content detection and remediation).
- b) Seven modules, one per capability.
- c) Five modules: the four-module default but with external-sharing split out of Permissions into its own module.
- d) An alternative split (specify).

Recommended: a. The flagship suites ship a handful of functional areas, not one product per capability: AvePoint Confidence Platform and Syskit Point bundle tenant inventory, lifecycle, and permission/access-review governance under one suite, ShareGate groups lifecycle automation with permissions audit (Protect), and Orchestry plus ProvisionPoint 365 carry provisioning and archive lifecycle as a distinct area, which is exactly the Inventory / Lifecycle / Permissions / Stale grouping. The same vendors sell migration (ShareGate Migrate, AvePoint Fly) and backup as separate products, so those fall outside this split and are handled by the q5 and q6 promote calls. This depends on the build shape in q1 and on the two collision calls below.

a4:

---

q5: One capability (backup and restore for collaboration workloads) overlaps a candidate SaaS Backup domain that has its own pure-play vendors (Veeam, Druva, Spanning, Keepit, HYCU, Barracuda, AvePoint Cloud Backup). How should it be handled?

- a) Promote SaaS Backup to its own domain and move the backup capability to it.
- b) Keep the backup capability under Collaboration Governance.
- c) Promote SaaS Backup but keep the backup capability here as a partial-overlap link.

Recommended: a. The backup specialists sell independently and several have no collaboration-governance offering at all, so backup reads as its own market. This depends on q1 and on the SaaS Backup triage.

a5:

---

q6: One capability (tenant migration) overlaps a candidate Tenant Migration domain that has its own pure-play vendors (ShareGate Migrate, AvePoint Fly, Quest On Demand Migration, BitTitan MigrationWiz, CloudM Migrate). How should it be handled?

- a) Promote Tenant Migration to its own domain and move the migration capability to it.
- b) Keep the migration capability under Collaboration Governance.
- c) Promote Tenant Migration but keep the migration capability here as a partial-overlap link.

Recommended: a. Migration is frequently bought separately from the governance suite (especially for mergers and acquisitions), so it reads as its own market. This depends on q1 and on the Tenant Migration triage.

a6:

---

q7: Three generic search aliases are already loaded. Four more aliases carry vendor or product names ("microsoft 365 governance", "m365 management", "sharepoint governance", "teams governance"). Should these be added too?

- a) Approve all four product-named aliases.
- b) Approve a subset (specify which).
- c) Skip them.

Recommended: a. These are the literal phrases buyers search for, and aliases feed catalog search and the domain skill's trigger phrases. They were held back only because they carry product names and need your explicit OK.

a7:

---

## Optional (will not hold up the build)

q8: Eight candidate master groups show up across the flagship governance vendors (workspace inventory with owners and membership; lifecycle policies, provisioning templates, and archive actions; permission audits, findings, access reviews, and attestations; external-sharing policies, share links, and guest users; stale-content signals and remediation; backup jobs and recovery points; migration projects and validations; delegated-admin and tenant-health). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and only after the modules exist. A few carry overlap with neighboring domains (access reviews with identity governance, external-sharing with data-loss prevention, plus the backup and migration sets that depend on q5 and q6), so they want a verification pass first.

a8:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-3 q3=B2-4 q4=B2-5 q5=B2-6 q6=B2-7 q7=B2-8 q8=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6+B3-7+B3-8 | domain_id=127 -->
