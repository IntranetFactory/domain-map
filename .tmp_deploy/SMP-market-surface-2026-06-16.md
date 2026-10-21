# SMP Market Surface Audit — 2026-06-16

Domain: SaaS Management Platforms (domain_id=85, domain_code=SMP). Read-only market audit. No inserts proposed for load; this is the gap report.

## Current footprint (live PostgREST, 4 full modules, 21 domain_owned entities)

| Module | Entities |
|---|---|
| SMP-DISCOVERY (30) | saas_applications (master), shadow_it_apps, smp_app_owners, smp_app_integrations, smp_app_catalog_listings, smp_alerts, smp_app_lifecycle_stages |
| SMP-RENEWAL-VENDOR (31) | saas_subscriptions, saas_applications (consumer), legal_contracts (embedded_master), org_units (embedded_master), smp_renewal_tasks, smp_renewal_engagements, smp_vendor_negotiations, smp_spend_allocations, smp_vendor_risk_assessments |
| SMP-OPTIMIZATION (184) | smp_license_seat_assignments, saas_usage_metrics, smp_optimization_recommendations, smp_reclamation_actions, smp_app_benchmarks |
| SMP-AUTOMATION (185) | smp_automation_workflows, smp_workflow_runs, smp_app_requests |

## Vendors

| Vendor | Specialist in | Why included |
|---|---|---|
| Zluri | SaaS mgmt + access lifecycle/reviews; 9 discovery methods; offboarding playbooks; UAR campaigns | Pure-play leader; deepest access-review/compliance surface; anchors compliance column |
| Torii | SaaS mgmt, mid-market; discovery, spend/renewal, no-code on/offboarding workflows, contract repo | Flagship pure-play; strong workflow + renewal/contract; mid-market |
| Josys | SaaS + DEVICE management converged for SMB/mid-market (50-250 sweet spot) | Central to "ERP for IT, 50-250"; ships SaaS + hardware lifecycle in one |
| Setyl | IT asset + SaaS + spend mgmt; app/license register, hardware register, vendor/contract, spend, GL integration | 50-250 specialist; strongest SaaS->IT-suite convergence; anchors contract/spend |
| BetterCloud | SaaS operations + security; user lifecycle automation, least-privilege, file/data security, deprovisioning evidence | Defines automation + data-deprovisioning/offboarding-evidence surface |
| Productiv | SaaS intelligence; feature-level engagement analytics, rationalization, right-sizing benchmarks | Best-in-class usage/engagement + benchmarking |
| Zylo | Enterprise SaaS mgmt + spend/renewal intelligence; SaaS contract/renewal system of record | Anchors spend + renewal-as-SoR + benchmark column |

## Surface matrix (union; * = not in current footprint)

| Entity | Category | Class | Module | In catalog | Vendors |
|---|---|---|---|---|---|
| saas_applications | master | core | DISCOVERY | yes | all 7 |
| shadow_it_apps | master | core | DISCOVERY | yes | Zluri,Torii,Josys,BetterCloud |
| smp_app_owners | junction | common | DISCOVERY | yes | Zluri,Torii,Setyl,Zylo |
| smp_app_integrations | config | core | DISCOVERY | yes | Zluri,Torii,Josys,Setyl,BetterCloud |
| smp_app_catalog_listings | master | common | DISCOVERY | yes | Zluri,Torii,Josys |
| smp_alerts | engagement | common | DISCOVERY | yes | Zluri,Torii,BetterCloud,Zylo |
| smp_app_lifecycle_stages | config | common | DISCOVERY | yes | Zluri,Torii,Productiv |
| smp_discovery_sources * | config | core | DISCOVERY | no | Zluri,Torii,Josys,Setyl,Zylo |
| smp_app_accounts * | master | core | DISCOVERY | no | Zluri,Torii,BetterCloud,Josys |
| smp_app_categories * | config | common | DISCOVERY | no | Zluri,Torii,Productiv,Zylo |
| saas_subscriptions | master | core | RENEWAL-VENDOR | yes | Zluri,Torii,Setyl,Zylo,Josys |
| smp_renewal_tasks | junction | core | RENEWAL-VENDOR | yes | Zluri,Torii,Setyl,Zylo |
| smp_renewal_engagements | engagement | common | RENEWAL-VENDOR | yes | Zluri,Zylo,Setyl |
| smp_vendor_negotiations | engagement | specialist | RENEWAL-VENDOR | yes | Zylo,Setyl |
| smp_spend_allocations | master | core | RENEWAL-VENDOR | yes | Zylo,Setyl,Productiv,Torii |
| smp_vendor_risk_assessments | compliance | compliance | RENEWAL-VENDOR | yes | Zluri,Zylo,Setyl |
| legal_contracts (embedded_master) | master | core | RENEWAL-VENDOR | yes | Zluri,Torii,Setyl,Zylo,Josys |
| org_units (embedded_master) | master | common | RENEWAL-VENDOR | yes | Zluri,Torii,Setyl,Productiv |
| smp_vendor_invoices * | master | common | RENEWAL-VENDOR | no | Zylo,Setyl,Torii |
| smp_payment_schedules * | junction | specialist | RENEWAL-VENDOR | no | Zylo,Setyl |
| smp_license_seat_assignments | junction | core | OPTIMIZATION | yes | Zluri,Torii,Josys,BetterCloud,Productiv |
| saas_usage_metrics | audit | core | OPTIMIZATION | yes | Zluri,Torii,Productiv,BetterCloud,Zylo |
| smp_optimization_recommendations | engagement | core | OPTIMIZATION | yes | Zluri,Productiv,Zylo,Torii |
| smp_reclamation_actions | junction | core | OPTIMIZATION | yes | Zluri,Torii,BetterCloud |
| smp_app_benchmarks | config | specialist | OPTIMIZATION | yes | Productiv,Zylo |
| smp_license_tiers * | config | common | OPTIMIZATION | no | Zluri,Productiv,Torii,Zylo |
| smp_feature_usage_events * | audit | specialist | OPTIMIZATION | no | Productiv,Zluri |
| smp_automation_workflows | config | core | AUTOMATION | yes | Zluri,Torii,BetterCloud,Josys |
| smp_workflow_runs | audit | core | AUTOMATION | yes | Zluri,Torii,BetterCloud |
| smp_app_requests | engagement | core | AUTOMATION | yes | Zluri,Torii,BetterCloud,Josys |
| smp_access_grants * | junction | core | AUTOMATION | no | Zluri,BetterCloud,Torii |
| smp_offboarding_runs * | audit | compliance | AUTOMATION | no | Zluri,Torii,BetterCloud,Josys |
| smp_deprovisioning_logs * | compliance | compliance | AUTOMATION | no | Zluri,BetterCloud,Torii |
| smp_access_reviews * | compliance | compliance | AUTOMATION | no | Zluri,BetterCloud |
| smp_access_review_items * | compliance | compliance | AUTOMATION | no | Zluri,BetterCloud |
| smp_app_permission_profiles * | config | specialist | AUTOMATION | no | Zluri,BetterCloud |

## Compliance entities (non-optional regardless of vendor presence)

| Entity | Basis | Status |
|---|---|---|
| smp_access_reviews | SOX UAR campaigns; SOC2 CC6.2/CC6.3; ISO 27001 A.9.2.5 | MISSING |
| smp_access_review_items | Per-line approve/revoke certification evidence | MISSING |
| smp_offboarding_runs | SOX/SOC2 offboarding evidence; ISO 27001 A.9 | MISSING |
| smp_deprovisioning_logs | GDPR erasure proof; SOX deprovisioning trail; SOC2 CC6.x | MISSING |
| smp_access_grants | SOX least-privilege; entitlement state (who-has-what) | MISSING |
| smp_vendor_risk_assessments | SOC2/GDPR vendor due diligence; DPA tracking | PRESENT |

## Diff summary counts

- MISSING: 13 (5 compliance, 8 non-compliance)
- WRONG-OWNERSHIP: 0
- SCOPE-CREEP: 0 (2 in-surface entities flagged "specialist-tier, keep": smp_vendor_negotiations, smp_app_benchmarks)
- MODULARIZATION ISSUES: 0

## Boundary checks (correctly EXCLUDED, not SMP gaps)

- on-prem/installed software licensing -> SAM (sibling)
- cross-asset unified contract master -> ITAM umbrella (legal_contracts is correctly embedded_master here)
- hardware_assets / device_inventory -> ITAM/SAM (Josys/Setyl ship it; not SMP-owned — see convergence)
- cloud infra cost / committed-use -> FINOPS
- identity providers / SSO governance as a mastered object -> IGA (SMP consumes, does not master)

## Top 5 most-impactful MISSING entities

1. **smp_access_reviews** (AUTOMATION, compliance) — User-access-review/certification campaign header. The primary SOX/SOC2 access-governance artifact in SMP; first-class in Zluri + BetterCloud. SMP has no entity for it.
2. **smp_access_grants** (AUTOMATION, compliance) — Entitlement-state object (user x app x role currently provisioned). Distinct from smp_license_seat_assignments (commercial seat). It is the subject every access review certifies; without it there is no who-has-access-to-what fact.
3. **smp_deprovisioning_logs** (AUTOMATION, compliance) — Immutable per-app data-deprovisioning/data-deletion evidence (account deactivated, data exported/deleted, license reclaimed, actor, timestamp). Required for GDPR erasure proof and SOX.
4. **smp_offboarding_runs** (AUTOMATION, compliance) — Per-departing-user offboarding execution record with per-app revocation steps + outcome. Every flagship models it; smp_workflow_runs is too generic to serve as the leaver-evidence artifact.
5. **smp_discovery_sources** (DISCOVERY, core) — Discovery-method/connector registry (SSO, finance feed, browser/desktop agent, HRIS, direct API). Zluri markets 9 discovery methods as configured, coverage-tracked sources; smp_app_integrations covers app-to-app links, not the discovery channels feeding the inventory.

## Modularization verdict

COHERENT. The 4-module split (Discovery / Renewal-Vendor / Optimization / Automation) maps to the four jobs a deployer recognizes and each module self-explains; Rule #14 floor passes (4 full modules, each with >=1 required master). The real gap is DEPTH inside SMP-AUTOMATION, which carries only workflow plumbing and lacks the access-governance/compliance evidence layer (reviews, grants, offboarding runs, deprovisioning logs) every flagship now treats as core — a MISSING-entity gap inside a correctly-scoped module, not a split defect. OPTIONAL commentary: if those 5 access-governance entities are added, consider renaming SMP-AUTOMATION to reflect "access governance + automation" (user sign-off only; do not act unilaterally).

## Convergence observation (commentary, central to the "ERP for IT, 50-250 users" question)

Modern SMP vendors are extending DOWN into hardware, contracts, and unified spend — converging toward an integrated "ERP for IT" suite, most visibly at the 50-250-user tier. Josys ships SaaS + device inventory/assignment in one product; Setyl fuses SaaS + hardware register + vendor/contract + spend with GL integration; Zluri/Torii/Zylo have all added contract repositories and finance-fed spend.

SMP's current surface ALREADY captures the renewal/contract and spend convergence (saas_subscriptions, legal_contracts embedded_master, smp_spend_allocations, smp_renewal_*, smp_vendor_*). The entities SMP does NOT and per the boundary rules should NOT own are hardware_assets/device_inventory (ITAM/SAM) and the cross-asset unified contract master (ITAM umbrella). The convergence is therefore a CROSS-DOMAIN composition story — "ERP for IT" = SMP + ITAM + SAM + FINOPS surfaced as one suite — not a reason to expand SMP into hardware. Within SMP's correct boundary the convergence does justify deepening spend granularity (smp_vendor_invoices, smp_payment_schedules) and discovery breadth (smp_discovery_sources, smp_app_accounts), which are SMP-owned and listed above as MISSING.
