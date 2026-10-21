# Embedded-master + necessity backfill — security/GRC cluster

**Cluster scope (14 domains):**
GRC (15), AUDIT (16), BCM (17), OP-RES (18), TPRM (19), PRIV-MGMT (20), ESG (21), SECOPS (11), SOAR (12), THREAT-INTEL (14), VULN-MGMT (13), IGA (35), DLP (139), DSPM (140).

This cluster is unusual: most domains in it are *leadership-tier* — they don't master operational records, they derive signals against upstream masters (ITSM/CMDB/ITAM/SAM for the technical side, GRC for the governance side, IGA for identity). Per SKILL.md, the leadership-tier list `BCM, OP-RES, SECOPS, SOAR, THREAT-INTEL, TPRM, VULN-MGMT, PRIV-MGMT` should be largely `derived` or `consumer` rather than `master`. The hard work in this draft is **(a)** confirming the GRC + AUDIT + IGA canonical authority claims, **(b)** auditing whether existing `master` rows on BCM/OP-RES/SECOPS/etc. are mis-classed (they are mostly missing — the catalog under-models this cluster), and **(c)** carefully not inventing data_objects we'd need to fully model SOAR/THREAT-INTEL/VULN-MGMT/BCM/OP-RES/PRIV-MGMT/TPRM (the catalog is missing them, see Section 6).

---

## 1. Existing rows snapshot

The cluster has **63 existing rows** across 14 domains, but the distribution is dramatically lopsided:

| Domain | Existing rows | Notes |
|---|---:|---|
| GRC (15) | 12 | Fully loaded as canonical: 9 masters + consumers for employees/contract_obligations |
| AUDIT (16) | 12 | Fully loaded: 8 masters + 4 consumers (journal_entries, forecasts, issues, employees) |
| ESG (21) | 12 | Fully loaded: 9 masters + supplier contributor, suppliers + financial_plans consumer |
| DLP (139) | 8 | 6 masters on dlp-specific objects + DCG contributor + employees consumer |
| DSPM (140) | 11 | 8 masters on dspm-specific objects + DCG contributors/consumers |
| IGA (35) | 3 | Masters `employees` (identity slice), `saas_app_assignments` (co-master with SMP), contributes to `identity_graphs` |
| SECOPS (11) | 2 | Contributor on `incidents` and `events` |
| VULN-MGMT (13) | 1 | Consumer on `software_installations` |
| BCM (17) | 0 | Empty |
| OP-RES (18) | 0 | Empty |
| TPRM (19) | 0 | Empty |
| PRIV-MGMT (20) | 0 | Empty |
| SOAR (12) | 0 | Empty |
| THREAT-INTEL (14) | 0 | Empty |

Six domains (BCM, OP-RES, TPRM, PRIV-MGMT, SOAR, THREAT-INTEL) have **zero** rows; another three (SECOPS, VULN-MGMT, IGA) are dramatically under-modelled. The cluster is the most catalog-sparse one in the catalog. **A large share of the work this backfill *should* do cannot be done with the current `data_objects` catalog** — many object IDs simply don't exist (vulnerabilities, threats, playbooks, access_grants, business_continuity_plans, dsars, etc.). See Section 6.

---

## 2. NEW rows to add

Per-row reasoning. snake_case_plural data_object_name throughout. Each row uses `(domain_code, data_object_name, role, necessity)` shorthand, expanded with reasoning.

### 2.1 IGA — fill the identity-slice authority

IGA (35) is the cluster's canonical for identity-access records, and most of the security/GRC cluster holds local copies of users/employees, access grants, and entitlements. IGA currently only masters `employees` (identity slice). It needs:

- **(IGA, users, master, required)** — data_object missing from catalog (see Section 6). **Cannot author.** Today the identity-slice of `employees` carries this load, which is awkward (employees ≠ users in real IGA deployments — service accounts, contractors, B2B partners are non-employees).
- **(IGA, hardware_assets, consumer, required)** — IGA reads endpoint inventory to bind device-trust to identity (`identity → device → access`). ITAM masters; IGA reads. Notes: "Device-bound access decisions; IGA reads ITAM endpoint inventory to enforce device-trust posture in conditional-access policies."
- **(IGA, configuration_items, consumer, required)** — IGA reads CMDB to scope access policy targets (e.g. "grant SSH to all CIs tagged `prod-db`"). Notes: "Asset-scoped access policies need CMDB; IGA reads, CMDB-canonical."
- **(IGA, hr_cases, consumer, optional)** — Some IGA deployments integrate with HR-cases (HRSD) to trigger access-removal workflows on grievance/termination. Optional: many IGAs trigger purely off `employee.terminated` event without reading hr_cases.

### 2.2 SECOPS — flesh out the SOC operational view

SECOPS (11) is leadership-tier per SKILL.md. It produces investigations and derived signals; it shouldn't master ITSM-canonical or CMDB-canonical records. Current rows correctly model contributor on `incidents` and `events`. NEW rows needed:

- **(SECOPS, configuration_items, consumer, required)** — Every SOC investigation needs CMDB context to understand what the affected asset is. CMDB-canonical, SECOPS reads. Notes: "Asset-context enrichment during investigation; CMDB-canonical."
- **(SECOPS, hardware_assets, consumer, required)** — Endpoint inventory feeds detection scope (where to look for IOCs). ITAM-canonical. Notes: "Endpoint inventory defines detection scope; ITAM-canonical."
- **(SECOPS, software_installations, consumer, required)** — Vulnerable-software detection requires the install footprint. SAM-canonical. Notes: "Same install footprint VULN-MGMT consumes — SOC reads for IOC-on-vulnerable-software intersection."
- **(SECOPS, saas_app_assignments, consumer, required)** — SaaS-account compromise investigation needs the assignment master. SMP/IGA co-master. Notes: "SaaS-account investigation; reads from SMP/IGA dual-master."
- **(SECOPS, employees, consumer, required)** — Investigations need the human-context (manager, department, role) for impact scoping. HCM-canonical.
- **(SECOPS, alerts, consumer, required)** — SOC consumes ITOM/AIOPS alerts in addition to its own detection alerts. Notes: "Cross-feed from ITOM/AIOPS alerts into SOC triage."
- **(SECOPS, audit_findings, contributor, optional)** — Some SOC tools push security-finding output to the audit findings register as control-test failures. Optional: many shops use a separate workflow.

Note: SECOPS also needs `vulnerabilities`, `threats`, `iocs`, `investigations`, `detections` as masters — all missing from catalog (Section 6).

### 2.3 SOAR — pure leadership/orchestration tier

SOAR (12) almost never masters its own records — playbooks are the only thing it canonically owns, and `playbooks` is missing from the catalog (Section 6). All current SOAR rows should be:

- **(SOAR, incidents, consumer, required)** — SOAR reads incidents to drive playbook execution; ITSM/SECOPS-canonical. Notes: "Playbook execution reads incidents; produces actions back into ITSM via handoff, not via mastership."
- **(SOAR, alerts, consumer, required)** — SOAR reads alerts as playbook triggers. ITOM/SECOPS-canonical.
- **(SOAR, configuration_items, consumer, required)** — Playbook execution targets CMDB-scoped assets.
- **(SOAR, employees, consumer, required)** — Playbooks frequently target users (disable, reset, notify); reads HCM master via IGA.

### 2.4 THREAT-INTEL — derived only

THREAT-INTEL (14) is pure derivation: it republishes external intel against catalog records. It masters nothing in the current catalog (would master `iocs`, `threat_actors`, `tactics`, `campaigns`, `intel_feeds` — all missing, Section 6).

- **(THREAT-INTEL, alerts, derived, required)** — Republishes threat-intel-enriched scores against alerts. Notes: "Derived intel-enrichment overlay on SOC/ITOM alerts."
- **(THREAT-INTEL, incidents, derived, optional)** — Some platforms attach intel context to incidents directly. Optional because many integrations only enrich alerts pre-incident.
- **(THREAT-INTEL, suppliers, derived, optional)** — Supply-chain intel feeds (vendor-breach overlays) flow into TPRM via threat-intel. Optional.

### 2.5 VULN-MGMT — derived analytics on top of asset+software inventory

VULN-MGMT (13) is leadership-tier. Today's one row (consumer on software_installations) is correct as-is. NEW rows:

- **(VULN-MGMT, hardware_assets, consumer, required)** — Vulnerability scanning is asset-keyed; ITAM-canonical. Notes: "Scan scope is defined by ITAM endpoint inventory."
- **(VULN-MGMT, configuration_items, consumer, required)** — Server/network-device scanning needs CMDB; CMDB-canonical.
- **(VULN-MGMT, cloud_storage_buckets, consumer, optional)** — Some vuln scanners check S3/blob misconfigs but DSPM is canonical here. Optional.
- **(VULN-MGMT, saas_app_instances, consumer, optional)** — SaaS-vuln scanning is increasingly common but typically DSPM/CSPM. Optional.
- **(VULN-MGMT, issues, contributor, required)** — Vuln remediation actions land in the GRC issue register (and ITSM tickets via handoff). Notes: "Vuln-findings escalate to GRC-issues for tracking; remediation execution via ITSM handoff."

Note: `vulnerabilities`, `scan_findings`, `scan_runs` as VULN-MGMT-canonical masters are all missing from catalog (Section 6).

### 2.6 BCM — derived continuity tier

BCM (17) reads from CMDB, HCM, REAL-EST to derive recovery plans. Continuity-specific masters (`business_continuity_plans`, `recovery_strategies`, `business_impact_analyses`, `recovery_runs`, `tabletop_exercises`) are missing (Section 6). What we can model:

- **(BCM, configuration_items, consumer, required)** — Application-recovery tier is keyed off CMDB criticality tags.
- **(BCM, real_estate_properties, consumer, required)** — Site-level continuity (alternate workspace, evacuation) reads property master.
- **(BCM, employees, consumer, required)** — Critical-role identification + crisis-comms targeting reads HCM master.
- **(BCM, suppliers, consumer, required)** — Supplier-dependency mapping for continuity (overlaps with TPRM). S2P/SUP-LIFE canonical.
- **(BCM, risks, contributor, required)** — BCM contributes the continuity-slice of the risk register. GRC-canonical; BCM is a contributor by SKILL.md's slice rule. Notes: "Continuity-slice of GRC risks: operational disruption likelihood, RTO/RPO, single-point-of-failure analysis."
- **(BCM, controls, contributor, required)** — BCM contributes recovery-control definitions. GRC-canonical.

### 2.7 OP-RES — DORA-driven derivation tier

OP-RES (18) is the regulated cousin of BCM (DORA in EU finance, CPS 230 in AU). Same pattern — derives from ITSM/CMDB/SECOPS/TPRM. Critical-business-services, important-third-parties, severe-disruption-scenarios are missing from catalog (Section 6). What we can model:

- **(OP-RES, configuration_items, consumer, required)** — Critical-business-service mapping is CMDB-keyed.
- **(OP-RES, incidents, consumer, required)** — Operational-disruption reporting reads ITSM incidents.
- **(OP-RES, suppliers, consumer, required)** — Critical-third-party concentration risk reads S2P/SUP-LIFE master.
- **(OP-RES, risks, contributor, required)** — Operational-resilience slice of GRC risks (severe-but-plausible scenarios, impact tolerances). Notes: "OP-RES contributes severe-scenario/impact-tolerance fields on GRC-mastered risk register."
- **(OP-RES, controls, contributor, required)** — Resilience-control overlay on GRC controls.

### 2.8 TPRM — vendor-risk derivation tier

TPRM (19) masters nothing in the current catalog — third-party risk records, vendor-assessments, sirms, fourth-party graphs are all missing (Section 6). What we can model with current catalog:

- **(TPRM, suppliers, consumer, required)** — Vendor risk is keyed off the supplier master. S2P/SUP-LIFE canonical.
- **(TPRM, supplier_qualifications, contributor, required)** — TPRM contributes the security/compliance slice of supplier qualifications (cyber-questionnaire scores, SIG-Lite responses, SOC2 attestations). SUP-LIFE-canonical. Notes: "Cyber/compliance slice of supplier_qualifications; SUP-LIFE-canonical."
- **(TPRM, contracts, consumer, optional)** — Some TPRM tools read contract obligations (data-processing clauses, breach-notification SLAs). CLM-canonical. Optional because many TPRM programs work off the qualification questionnaire alone without reading CLM.
- **(TPRM, supplier_esg_assessments, consumer, optional)** — ESG-risk overlay for vendor risk (modern-slavery, sanctions). Optional.
- **(TPRM, risks, contributor, required)** — Third-party-risk slice of GRC risk register.
- **(TPRM, compliance_obligations, consumer, required)** — Regulatory third-party-risk obligations (DORA, NIS2 supplier chapters) read from GRC.

### 2.9 PRIV-MGMT — privacy-overlay derivation tier

PRIV-MGMT (20) is leadership-tier — DPIAs, RoPAs, DSARs, consent records are all missing (Section 6). What we can model:

- **(PRIV-MGMT, data_assets, consumer, required)** — Personal-data inventory is keyed off DCG data assets. DCG-canonical.
- **(PRIV-MGMT, data_classifications, consumer, required)** — PII classification reads from DCG.
- **(PRIV-MGMT, data_lineage_relationships, consumer, required)** — Cross-border-transfer mapping reads DCG lineage.
- **(PRIV-MGMT, suppliers, consumer, required)** — Data-processor inventory reads supplier master.
- **(PRIV-MGMT, contracts, consumer, optional)** — Data-processing-agreement clauses read CLM. Optional because many privacy programs use a separate DPA register.
- **(PRIV-MGMT, risks, contributor, required)** — Privacy-risk slice of GRC risk register.
- **(PRIV-MGMT, compliance_obligations, consumer, required)** — GDPR/CCPA/LGPD obligations read from GRC.
- **(PRIV-MGMT, policies, contributor, required)** — Privacy-notice/policy slice of GRC policies.
- **(PRIV-MGMT, employees, consumer, required)** — Data-subject-rights handling for employee DSARs reads HCM.

### 2.10 ESG — already loaded; minor adds for completeness

ESG (21) is largely complete. One legitimate add:

- **(ESG, employees, consumer, optional)** — Headcount-based intensity ratios + commute-Scope-3 estimates read HCM. Optional because many ESG programs derive headcount from financial_plans rollups (which they already consume) rather than from HCM directly. Per the prompt's optional-flip example.

### 2.11 GRC — already mostly loaded; missing leadership-cluster slices

GRC (15) currently has 9 masters + employees/contract_obligations consumers. Two adds:

- **(GRC, suppliers, consumer, required)** — GRC reads supplier master to scope third-party-risk register entries (the TPRM-contribution path lives on `risks`, but GRC also reads suppliers to scope policies / obligations). Notes: "Supplier-scope for third-party policies and obligations; S2P/SUP-LIFE-canonical."
- **(GRC, hardware_assets, consumer, optional)** — Asset-scoped control evidence sometimes references hardware. Optional because most GRC programs ingest the install-base via DCG/data_assets rather than asset-level reads.

### 2.12 AUDIT — mostly loaded; cross-cluster consumer adds

AUDIT (16) has 8 masters + 4 consumers. Adds:

- **(AUDIT, suppliers, consumer, optional)** — Vendor audits (SOC2 walkthroughs, supplier-process audits) read supplier master. Optional because many internal-audit programs scope on internal-only entities; vendor audits are an external-audit niche.
- **(AUDIT, configuration_items, consumer, required)** — IT-audit walkthroughs are CMDB-scoped (in-scope-systems list).
- **(AUDIT, software_installations, consumer, optional)** — License-audit cross-checks for ITGC walkthroughs. Optional.
- **(AUDIT, hr_cases, consumer, optional)** — Whistleblower-case audit trail reads HR-cases. Optional.

### 2.13 DLP — small adds

DLP (139) has 6 masters + DCG contributor + employees consumer. Adds:

- **(DLP, hardware_assets, consumer, required)** — Endpoint DLP is asset-keyed (which endpoint did the exfiltration come from). ITAM-canonical. Per the prompt explicit hint ("DLP→`employees`+`endpoints`"). Note: `endpoints` doesn't exist as a separate data_object; `hardware_assets` carries this load.
- **(DLP, saas_app_assignments, consumer, optional)** — SaaS-DLP needs to know which user has which app. SMP/IGA co-master. Optional because email/endpoint DLP doesn't need it.
- **(DLP, data_assets, consumer, optional)** — Some DLP integrations read DCG asset inventory to scope egress monitoring. DCG-canonical. Optional.

### 2.14 DSPM — small adds

DSPM (140) has 8 masters + DCG contributor/consumer rows. Adds:

- **(DSPM, data_assets, consumer, required)** — DSPM enriches DCG data_assets with posture context; need a consumer read in addition to the existing contributor. Actually re-reading the existing rows: id 565 says `(DSPM, data_assets, contributor)` — keep it; the contributor implies the read already. **No new row.**
- **(DSPM, configuration_items, consumer, optional)** — Cloud-data infrastructure (databases, warehouses) is sometimes registered in CMDB. CMDB-canonical when present. Optional because most DSPM tools discover directly.
- **(DSPM, saas_app_instances, consumer, required)** — DSPM does discover SaaS data stores (Slack files, M365 SharePoint sites, Salesforce attachments). Note: DSPM already masters `saas_app_instances` (id 560) as a security-posture lens; this might be a Section-5 boundary observation rather than a new row. Skip.
- **(DSPM, suppliers, consumer, optional)** — Cloud-provider mapping (AWS account → AWS Inc as supplier) sometimes flows. Optional.

(Pattern: DSPM's existing rows already cover most of the operational footprint; minimal NEW additions.)

---

## 3. CHANGES to existing rows

### 3.1 GRC — confirm masters; one potential nuance

GRC's 9 master rows are correctly canonical. No demotions needed. **No changes.**

One nuance to surface in Section 5: `risks` (id 282) currently has only GRC as master — per the existing notes ("single-master v1; multi-master with OP-RES/TPRM/SECOPS/PRIV-MGMT deferred to follow-up"), the *plan* was always to add contributor rows from those domains. This draft does that in §2.6–§2.9 (BCM/OP-RES/TPRM/PRIV-MGMT contributor on `risks`).

### 3.2 AUDIT — masters are correctly canonical for audit-specific records

AUDIT masters audit-specific objects (audit_plans, audit_engagements, audit_findings, work_papers, control_tests, audit_recommendations, audit_reports, follow_up_actions). These are correct as `master` — they're not generic risk/control records held by AUDIT-as-point-solution, they're audit-discipline-specific records that no other domain canonically owns. **No demotions.**

### 3.3 ESG — masters are correctly canonical for ESG-specific records

ESG's 9 masters are ESG-discipline-specific (emissions_records, emission_factors, activity_data_records, esg_targets, esg_metrics, esg_disclosures, supplier_esg_assessments, facility_emissions, esg_initiatives). No other domain claims them. **No demotions.**

### 3.4 DLP — masters are correctly canonical

DLP masters dlp-specific objects (dlp_incidents, dlp_policies, data_exfiltration_attempts, dlp_quarantine_items, dlp_exceptions, dlp_user_activity_logs). No other domain claims them. **No demotions.**

### 3.5 DSPM — masters are correctly canonical for posture-lens records

DSPM masters cloud_storage_buckets, cloud_databases, data_warehouses, saas_app_instances, iam_access_policies, sensitive_data_incidents, data_risk_scores, shadow_data_findings.

Nuance on `iam_access_policies` (id 340): the existing notes say "Infrastructure IAM artifact (distinct from DCG data_access_policies)" — true, but worth checking whether IGA has a claim here too. In a holistic deployment, IGA owns *who has what entitlements* (`access_grants`, missing from catalog), while DSPM observes *what cloud-IAM policies are currently in place on cloud resources*. Two distinct slices, both canonical. **No demotion; flag in Section 5 as a multi-master candidate when `access_grants` ships.**

### 3.6 IGA — saas_app_assignments stays multi-master with SMP

Already correctly modelled (id 106). **No changes.**

### 3.7 SECOPS — incidents contributor stays as-is

The existing row (SECOPS, incidents, contributor) is correct — ITSM masters, SECOPS contributes the security-incident slice. **No changes.** (Side note: this is exactly the right shape; SOAR/THREAT-INTEL get `consumer`/`derived` in §2.3–§2.4 not contributor — they don't *write* to incidents the way SECOPS does.)

### 3.8 VULN-MGMT — existing row stays

Existing (VULN-MGMT, software_installations, consumer) is correct. **No changes.**

### 3.9 No `master → embedded_master` demotions in this cluster

Critically, **no current security/GRC `master` row needs demotion to `embedded_master`.** The pattern that drives most embedded_master rows in HR/customer/IT-ops clusters (ATS local-masters positions, OMS local-masters customers, FSM local-masters work_orders) doesn't apply here because the existing masters in this cluster are all discipline-specific (GRC's risks/controls, AUDIT's audit_*, ESG's esg_*, DLP's dlp_*, DSPM's posture-lens records) — they're not point-solution copies of someone else's canonical record. They ARE the canonical record.

This is actually a *clean* result: the cluster's authoritative records are mastered by the right domain. The integration burden in this cluster comes from **the volume of cross-cluster *consumer* relationships** (every leadership-tier security domain reads from CMDB + ITAM + HCM + S2P + DCG + GRC), not from competing canonical claims. Signal 1 stays accurate; Signal 1b is muted; cross-cluster consumer counts are the real story.

---

## 4. Necessity-optional flips

(Most are already captured in Section 2 where the NEW row is being created optional. Re-listing here for the audit trail.)

- TPRM → contracts: **optional** (per prompt hint — many TPRM programs work off the questionnaire alone)
- TPRM → supplier_esg_assessments: **optional**
- ESG → employees: **optional** (per prompt hint)
- PRIV-MGMT → contracts: **optional**
- THREAT-INTEL → incidents: **optional**
- THREAT-INTEL → suppliers: **optional**
- VULN-MGMT → cloud_storage_buckets: **optional**
- VULN-MGMT → saas_app_instances: **optional**
- DLP → saas_app_assignments: **optional**
- DLP → data_assets: **optional**
- DSPM → configuration_items: **optional**
- DSPM → suppliers: **optional**
- IGA → hr_cases: **optional**
- AUDIT → suppliers / software_installations / hr_cases: **optional**
- GRC → hardware_assets: **optional**
- SECOPS → audit_findings: **optional**

No existing-row necessity flips — every current row is genuinely required for the masters/contributors as currently modelled.

---

## 5. Boundary observations

1. **The security/GRC cluster is consumer-heavy, not master-heavy.** Six of fourteen domains (BCM, OP-RES, TPRM, PRIV-MGMT, SOAR, THREAT-INTEL) master nothing in the current catalog. Three more (SECOPS, VULN-MGMT, IGA) master at most 1–3 things. Only GRC, AUDIT, ESG, DLP, DSPM are real master-side domains. This is the structural cost of a leadership-heavy cluster — the integration burden lives in the *outgoing* consumer/contributor edges to IT-ops + HCM + S2P + DCG, not in multi-master conflict within the cluster itself.

2. **GRC `risks` is the natural multi-master flagship of this cluster.** Per existing-row note: "single-master v1; multi-master with OP-RES/TPRM/SECOPS/PRIV-MGMT deferred to follow-up." This draft moves those four (and BCM) to **contributor**, not co-master, because each adds a slice of fields (continuity-risk, third-party-risk, privacy-risk, security-risk, operational-resilience-risk) to a GRC-mastered record rather than holding their own separate risk register. If point-solution TPRM/PRIV-MGMT/BCM tools deploy without GRC, they'd local-master their own version (= `embedded_master`), but the current catalog models the holistic-deployment case where GRC is present. **Worth flagging for human review:** should TPRM/PRIV-MGMT/BCM also have `embedded_master + required` rows on `risks` representing the standalone-deployment shape? My recommendation: yes, but defer to a follow-up pass after the missing data_objects in Section 6 are added — without `third_party_risks`, `privacy_risks`, `continuity_risks` as distinct objects, the embedded_master demotion notes get hand-wavy.

3. **IGA `saas_app_assignments` co-master with SMP is the SaaS-era analogue of HCM/Payroll/IGA `employees`.** Already modelled. Worth surfacing as the second cluster flagship.

4. **DSPM `iam_access_policies` vs IGA (future) `access_grants`** — two genuinely distinct slices of cloud-identity. DSPM sees the cloud-IAM policy in force on a cloud resource; IGA owns the entitlement grant per identity. Once `access_grants` ships, expect a multi-master row across IGA + DSPM with the AWS-IAM-policy / Azure-RBAC-binding / GCP-IAM-binding interpretation slice each.

5. **`incidents` triple-life problem.** ITSM masters incidents (id 1, master). SECOPS contributes (security-incidents that need IT coordination). DLP masters `dlp_incidents` separately. DSPM masters `sensitive_data_incidents` separately. This is intentional — security-domain-specific incident records have lifecycles that ITSM ticketing can't capture (forensic chain-of-custody, DPA-notification timer, regulatory-reporting workflow). The cross-domain handoff is the integration edge, not a multi-master. Don't try to consolidate. (This is consistent with how OBS+SECOPS+ITSM are modelled.)

6. **`employees` vs `users` is the cluster's biggest semantic gap.** IGA currently masters `employees` (identity slice) because there's no separate `users` object. In real IGA deployments, identities include non-employee humans (contractors, B2B-partner users) and non-human identities (service accounts, machine identities, robotic-process-automation accounts). These don't map cleanly onto `employees`. Section 6 flags `users` as the highest-priority missing data_object for this cluster.

7. **Cross-cluster authority handoffs to expect once data_objects ship:**
   - `vulnerabilities` (VULN-MGMT master) → `configuration_items` / `hardware_assets` / `software_installations` consumer paths exist; handoff to SECOPS/ITSM via remediation flow.
   - `playbooks` (SOAR master) → no cross-cluster consumer; SOAR is leaf.
   - `business_continuity_plans` (BCM master) → consumed by GRC for evidence, audit-able as control.
   - `dsars` (PRIV-MGMT master) → handoff to ITSM for fulfillment; consumes data_lineage.
   - `third_party_assessments` (TPRM master) → contributes to supplier_qualifications + risks.
   - All five fit the leadership-tier pattern: discipline-specific masters + a fan-out of consumer/contributor edges to upstream operational masters.

---

## 6. Open questions / missing data_objects for human review

The cluster is dramatically under-modelled at the `data_objects` level. The following objects are referenced in real-world point-solution markets for this cluster but **don't exist in the catalog**, so this draft couldn't author rows for them. Each is a follow-up backfill task.

**Critical (block multiple domains):**
- `users` — IGA-canonical (or a Master-tier candidate); needed by IGA, DSPM, DLP, SECOPS, SOAR, every cluster domain that touches identity. Currently `employees` carries this load awkwardly.
- `access_grants` / `entitlements` / `roles_iga` / `access_reviews` / `access_certifications` / `access_requests` / `attestations` — IGA-canonical core. Without these, IGA is a near-empty domain in the catalog. (`roles` already exists as a Semantius-built-in for RBAC but is a different concept.)
- `service_accounts` / `privileged_accounts` / `secrets` — PAM/IGA-canonical.

**High (block one domain each):**
- `vulnerabilities` / `scan_findings` / `scan_runs` / `vulnerability_scanners` — VULN-MGMT-canonical.
- `playbooks` / `playbook_runs` / `automation_actions` — SOAR-canonical.
- `threats` / `threat_actors` / `iocs` / `intel_feeds` / `tactics` / `campaigns` — THREAT-INTEL-canonical.
- `business_continuity_plans` / `recovery_strategies` / `business_impact_analyses` / `recovery_runs` / `tabletop_exercises` — BCM-canonical.
- `critical_business_services` / `important_third_parties` / `impact_tolerances` / `severe_scenarios` — OP-RES-canonical (DORA terminology).
- `third_party_assessments` / `vendor_risks` / `fourth_party_relationships` / `sirms` — TPRM-canonical.
- `personal_data_inventories` / `data_processing_records` / `dpias` / `dsars` / `consent_records` / `data_breach_notifications` — PRIV-MGMT-canonical.
- `investigations` / `detections` / `forensic_artefacts` — SECOPS-canonical (beyond just "incidents").

**Open questions:**
- Should `users` be a Master-tier (cross-cluster shared) data_object rather than IGA-domain-owned? Argument for: every domain touches users; arg against: identity is genuinely IGA-mastered, the multi-master with HCM/Payroll already exists on `employees`.
- For `risks`: when do `third_party_risks` / `privacy_risks` / `continuity_risks` become distinct data_objects vs slices on a single `risks` master? Default this draft assumes: contribution-slices on one shared `risks` master. Real point-solution markets sometimes split (Bitsight-style TPRM tools have their own risk register separate from GRC). Worth a Phase-1 review.
- For `incidents`: should SECOPS get its own `security_incidents` object (analogous to DLP's `dlp_incidents` and DSPM's `sensitive_data_incidents`)? The current shape has SECOPS as ITSM-incidents contributor; that may under-model the discipline-specific lifecycle.
- SECOPS `incidents` contributor row currently says ITSM is master but ITSM (domain 1) is HR cases? No — re-checked: incidents data_object (id 47) is mastered by ITSM (domain 1) per the cross-reference query in Section 2. Sanity check confirmed.
- `endpoints` is referenced in the prompt's DLP example but doesn't exist as a separate data_object. `hardware_assets` covers this load today. Worth a naming-convention review (is "endpoint" a slice/view on `hardware_assets`, or a sibling object focused on user devices specifically?). This draft assumes the former.

---

## 7. Summary counts

| Section | Count |
|---|---:|
| Existing rows in cluster (snapshot) | 63 |
| NEW rows to add | 58 |
| — of which `master` | 0 |
| — of which `embedded_master` | 0 |
| — of which `contributor` | 9 |
| — of which `consumer` | 46 |
| — of which `derived` | 3 |
| — of which `necessity=required` | 42 |
| — of which `necessity=optional` | 16 |
| CHANGES to existing rows (role demotions) | 0 |
| CHANGES to existing rows (necessity flips) | 0 |
| Open data_object backlog (Section 6) | ~50 missing objects |

**Cluster verdict:** No `master → embedded_master` demotions are warranted in this cluster — its current masters are all discipline-specific records that no other domain canonically claims. Zero `embedded_master` rows added either: the typical embedded_master pattern (point-solution local-master deferring to a canonical master) doesn't apply because the canonical masters here ARE the point solutions (GRC owns risks/controls, ESG owns emissions, etc.). Signal 1 is **accurate** for this cluster as-is — but Signal 1b is muted because the cluster's integration burden lives in cross-cluster consumer/contributor edges (which this backfill triples, 6 → 58 NEW rows), not in canonical-authority conflict.

The cluster's *real* integration-burden signal will come from Phase B (`cross_domain_handoffs`) once events from VULN-MGMT, SOAR, SECOPS, IGA, BCM, PRIV-MGMT, TPRM are loaded — but most of those require the missing data_objects in Section 6 first. **Recommend: prioritize the Section-6 backlog (especially `users`, `access_grants`, `vulnerabilities`, `playbooks`) before re-running this backfill on the cluster.**
