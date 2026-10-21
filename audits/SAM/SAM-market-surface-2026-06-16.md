# SAM market surface audit, 2026-06-16

Software Asset Management (domain_id 52), audited against current (2026) market practice. Read-only market audit. No inserts proposed.

**Scope boundary.** SAM owns on-prem / installed-software licensing: software catalog & normalization, installation discovery, entitlements & license reconciliation (Effective License Position), publisher audit defense. Out of scope, NOT reported as SAM MISSING: SaaS-subscription discovery/renewal -> SMP (sibling); hardware -> HAM; cross-asset master contracts -> ITAM umbrella; cloud cost/consumption -> FINOPS.

## Current footprint

3 full modules, 5 domain-owned masters, 2 embedded masters, 1 contributor.

| Module | Entity | Role |
|---|---|---|
| SAM-CATALOG-DISCOVERY (201) | software_titles | master |
| SAM-CATALOG-DISCOVERY (201) | software_installations | master |
| SAM-CATALOG-DISCOVERY (201) | configuration_items | contributor (ITSM/CMDB) |
| SAM-CATALOG-DISCOVERY (201) | org_units | embedded_master (HCM) |
| SAM-ENTITLEMENT-MGMT (202) | software_licenses | master |
| SAM-ENTITLEMENT-MGMT (202) | legal_contracts | embedded_master (CLM) |
| SAM-AUDIT-DEFENSE (203) | license_audits | master |

The footprint is thin: only 5 domain-owned masters back what flagship vendors model as ~30 entities. The 3-module shape is correct, but the catalog (license_metrics, entitlement_pools), the reconciliation output (ELP), the metering/optimization slice, and the entire audit-engagement child structure (evidence/findings/responses) have no backing entities.

## Vendors

Pure-play / category-defining SAM platforms, plus one audit-defense specialist (Anglepoint) for the compliance shape.

| Vendor | Specialist in | Why included |
|---|---|---|
| Flexera | Flexera One / FlexNet: normalization (Technopedia), ELP, audit defense | Market-leading pure-play; richest entitlement/ELP model |
| Snow Software (Insight) | Snow License Manager / Atlas: discovery, recognition (DRS), metering | Long-standing pure-play; strong installed-software recognition |
| USU | USU SAM (ex-Aspera): SAP/Oracle/IBM publisher optimization | The publisher-exotica reference (indirect access, options, sub-capacity) |
| ServiceNow SAM Pro | CMDB-native SAM: entitlements, reconciliation, Content Library | Defines the discovery/installation/normalized-product/entitlement shape most enterprises adopt |
| Anglepoint | Managed SAM + audit defense; ISO/IEC 19770 governance | Compliance/audit-defense specialist; source for evidence/finding/response shape |
| Certero | Certero for Enterprise SAM: unified discovery-to-ELP | Pure-play; corroborates core set independently of the big three |

## Surface matrix (condensed)

Categories: M=master, J=junction, A=audit/compliance, C=config. Classification: core / common / specialist / compliance. `*` = already in current footprint.

| Entity | Cat | Class | Module | In cat? |
|---|---|---|---|---|
| software_titles `*` | M | core | CATALOG-DISCOVERY | yes |
| software_editions | M | core | CATALOG-DISCOVERY | no |
| software_versions | M | core | CATALOG-DISCOVERY | no |
| publishers | M | core | CATALOG-DISCOVERY | no |
| software_categories | C | common | CATALOG-DISCOVERY | no |
| software_normalization_rules | C | core | CATALOG-DISCOVERY | no |
| eol_eosl_calendars | C | common | CATALOG-DISCOVERY | no |
| software_installations `*` | M | core | CATALOG-DISCOVERY | yes |
| discovery_runs | J | core | CATALOG-DISCOVERY | no |
| discovery_sources | C | common | CATALOG-DISCOVERY | no |
| software_identification_tags | M | specialist/compliance | CATALOG-DISCOVERY | no |
| software_licenses `*` | M | core | ENTITLEMENT-MGMT | yes |
| license_models | C | core | ENTITLEMENT-MGMT | no |
| license_metrics | C | core | ENTITLEMENT-MGMT | no |
| license_keys | M | common | ENTITLEMENT-MGMT | no |
| entitlement_pools | M | core | ENTITLEMENT-MGMT | no |
| license_allocations | J | core | ENTITLEMENT-MGMT | no |
| named_user_assignments | J | core | ENTITLEMENT-MGMT | no |
| product_use_rights | C | specialist | ENTITLEMENT-MGMT | no |
| license_position_calculations (ELP) | A | core/compliance | ENTITLEMENT-MGMT | no |
| compliance_positions | A | core/compliance | ENTITLEMENT-MGMT | no |
| usage_meterings | M | core | ENTITLEMENT-MGMT | no |
| license_reclamations | J | common | ENTITLEMENT-MGMT | no |
| license_renewals | M | common | ENTITLEMENT-MGMT | no |
| true_up_events | A | compliance | ENTITLEMENT-MGMT | no |
| publisher_options_packs | C | specialist | ENTITLEMENT-MGMT | no |
| license_audits `*` | M | core | AUDIT-DEFENSE | yes |
| audit_evidence_packages | A | compliance | AUDIT-DEFENSE | no |
| license_audit_findings | A | compliance | AUDIT-DEFENSE | no |
| audit_responses | A | compliance | AUDIT-DEFENSE | no |
| license_settlements | A | compliance | AUDIT-DEFENSE | no |

## Compliance entities (non-optional regardless of vendor presence)

- **license_position_calculations (ELP)** - the contractually-defined reconciliation publishers demand at audit.
- **audit_evidence_packages** - the deployment+entitlement proof bundle submitted in a publisher audit.
- **license_audit_findings** - the documented over/under-deployment gap (the exposure record). Named `license_audit_findings` NOT `audit_findings`: bare `audit_findings` (id 294) already exists as an FSQM contributor, so reusing it would collide on the catalog-wide single-master rule.
- **true_up_events** - annual contractual true-up (Microsoft EA, Adobe ETLA) reconciling actual vs entitled consumption.
- **audit_responses** - the formal response letter / negotiation record returned to the publisher.
- **license_settlements** - the settlement / remediation purchase that closes an audit exposure.
- **software_identification_tags** - ISO/IEC 19770-2 SWID tags, the standardized identification artifact for trustworthy recognition.

## Diff summary

| Bucket | Count |
|---|---|
| MISSING | 27 (8 compliance) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 (3 cross-domain rows reviewed, all correct: configuration_items contributor, org_units + legal_contracts embedded_master) |

No wrong-ownership: every existing master sits in the module the surface assigns it to. No scope-creep: the contributor and two embedded masters are the correct autonomous-deployable shape (Rule #19), not foreign-domain pollution.

## SAM <-> SMP boundary

**Clean by design, two watch items.** The line between on-prem licensing and SaaS management is the asset type, and the catalog already enforces it:

- SAM masters `software_titles` / `software_installations` / `software_licenses` (installed software, metric-based reconciliation, publisher audit).
- SMP masters `saas_applications` / `saas_subscriptions` / `saas_usage_metrics` / `smp_*` (cloud-hosted, seat-based, renewal & optimization).

**No domain-owned master is duplicated across both.** SMP's overlapping concepts are all `smp_*`-prefixed or `saas_*`-named, structurally distinct from SAM's `software_*` / `license_*` names. The only shared entities are `legal_contracts` (CLM-mastered) and `org_units` (HCM-mastered), each carried as `embedded_master` in both domains, which is the correct shape, not duplication.

Two watch items for any future load (so SAM masters are not collapsed into SMP equivalents):

1. **license_renewals (SAM) vs smp_renewal_engagements / saas_subscriptions (SMP).** A SAM-proposed `license_renewals` must scope to on-prem maintenance/support renewal of a `software_license`. SaaS subscription renewal stays in SMP. Do NOT add a saas-subscription-shaped renewal to SAM. Distinct names already respect this.
2. **usage_meterings (SAM) vs saas_usage_metrics (SMP).** SAM `usage_meterings` = installed-software metering (last-used, concurrent, metric counters for reconciliation). SMP `saas_usage_metrics` = SaaS login/seat-activity telemetry. Distinct concepts; keep distinct masters.

## Modularization verdict: COHERENT, keep 3 modules

The 3-module split self-explains to a first-time deployer: catalog+discovery (what software exists and where it is installed) / entitlement (what we are licensed for and reconciliation) / audit defense (proving it to a publisher). Each module has >=1 domain-owned master (Rule #14 satisfied), and the split mirrors how Flexera, Snow, and ServiceNow segment their own UIs.

**All 27 missing masters slot into one of the three existing modules with no new module required.** This supersedes the 2026-05-30 6-module proposal (B2-S1): metering and renewal are sub-capabilities of entitlement management, and every flagship packages them inside the license/entitlement product, not as separate products. After loading, SAM-CATALOG-DISCOVERY carries ~11 masters, SAM-ENTITLEMENT-MGMT ~14, SAM-AUDIT-DEFENSE ~5, which is a coherent and balanced distribution.

Optional future scaling note (not a present defect): if usage_meterings + license_reclamations + license_position_calculations later grow into a distinct optimization workflow (as SMP split SMP-OPTIMIZATION from SMP-RENEWAL-VENDOR), SAM-ENTITLEMENT-MGMT could split into entitlement vs optimization. That is a later decision, not a fix.

## Top 5 most-impactful missing entities

1. **license_position_calculations (ELP)** - the central computed output of SAM. The entitlement module exists to produce the Effective License Position; today no entity holds it. Compliance-critical.
2. **license_metrics** - the unit of measure (per-core, PVU, named-user, concurrent). Without it, `software_licenses` cannot be reconciled against installations at all.
3. **audit_evidence_packages** + **license_audit_findings** + **audit_responses** - the entire audit-engagement child structure. `license_audits` is a bare master today with no evidence/finding/response children; audit defense cannot function without them. Compliance-critical.
4. **entitlement_pools** + **usage_meterings** - the reconciliation join surface (purchased rights pool) and the metered consumption that draws it down. Backs the metering/optimization capability that has no entity today.
5. **publishers** - the first-class publisher master (Microsoft, Oracle, IBM, SAP, Adobe) that titles, licenses, audits, and use-rights all hang off. Structurally foundational and absent.
