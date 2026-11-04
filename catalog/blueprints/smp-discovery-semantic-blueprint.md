---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: SMP Discovery and Catalog
tagline: Find every SaaS app in use, including the ones nobody told you about.
description: Automatically discover sanctioned and shadow SaaS across your org, assign an owner to each app, and connect the integrations that feed usage and spend data. Publish a clean app catalog, stage each application through its portfolio lifecycle, and get alerted the moment something needs attention.
system_slug: smp-discovery
domain_modules:
  - smp-discovery
domain_code: SMP
icon_name: cloud-cog
related_modules: [apm-portfolio-registry, iga-entitlement-catalog, it-ops-starter, itam-portfolio-reporting, smp-automation, smp-optimization, smp-renewal-vendor, spend-mgmt-cards]
persona: [IT-SAAS-ADMIN, ITAM-SAAS-PORTFOLIO-MANAGER]
supports_raci: true
created_at: 2026-11-04
---

# SMP Discovery and Catalog

## 1. Overview

Discovery of sanctioned and shadow SaaS, app inventory, ownership, integrations, lifecycle staging, catalog publication, and operational signal/alerts. The discovery substrate of an SMP deployment.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| App Catalog Listings | `smp_app_catalog_listings` | Published listings of sanctioned SaaS apps that employees can browse and request, with description, owner, request route, and approval flow. |
| App Lifecycle Stages | `smp_app_lifecycle_stages` | Portfolio-rationalization stages of a SaaS app such as evaluate, pilot, sanctioned, sunset, and retired. |
| SaaS Alerts | `smp_alerts` | System-raised alerts on the SaaS portfolio: shadow-IT signups, projected license overages, opening renewals, or vendor-risk changes. |
| SaaS App Integrations | `smp_app_integrations` | Configured connections between the SaaS management platform and an app's APIs for sign-on, provisioning, finance, and usage data. |
| SaaS App Owners | `smp_app_owners` | Typed owner assignments relating a user to a SaaS app as its business, IT, finance, or security owner. |
| SaaS Applications | `saas_applications` | SaaS applications in the company portfolio, with vendor, category, criticality, owner, and whether each is sanctioned or shadow IT. |
| Shadow IT Apps | `shadow_it_apps` | SaaS apps found in use but not officially sanctioned, discovered through expense data, sign-on logs, browser, or network signals. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  saas_applications["SaaS Applications"]
  shadow_it_apps["Shadow IT Apps"]
  smp_app_owners["SaaS App Owners"]
  smp_app_integrations["SaaS App Integrations"]
  smp_app_catalog_listings["App Catalog Listings"]
  smp_alerts["SaaS Alerts"]
  smp_app_lifecycle_stages["App Lifecycle Stages"]
  users["Users"]
  shadow_it_apps -->|"promotes_to"| saas_applications
  saas_applications -->|"owns"| smp_app_owners
  saas_applications -->|"integrates_with"| smp_app_integrations
  saas_applications -->|"publishes"| smp_app_catalog_listings
  saas_applications -->|"has_alerts"| smp_alerts
  shadow_it_apps -->|"has_alerts"| smp_alerts
  smp_app_lifecycle_stages -->|"has_stage"| saas_applications
  users -->|"owns"| saas_applications
  users -->|"triggered"| shadow_it_apps
  users -->|"assigned_owner"| smp_app_owners
  users -->|"configures"| smp_app_integrations
  users -->|"curates"| smp_app_catalog_listings
  users -->|"triages"| smp_alerts
  class saas_applications master;
  class shadow_it_apps master;
  class smp_app_owners master;
  class smp_app_integrations master;
  class smp_app_catalog_listings master;
  class smp_alerts master;
  class smp_app_lifecycle_stages master;
  class users platform_builtin;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `smp_app_catalog_listings` | `smp_app_catalog_listings` | App Catalog Listing | App Catalog Listings | master | - | - | - | - | catalog | `:admin` | - |
| 2 | `smp_app_lifecycle_stages` | `smp_app_lifecycle_stages` | App Lifecycle Stage | App Lifecycle Stages | master | - | - | - | - | operational_workflow | `:manage` | - |
| 3 | `smp_alerts` | `smp_alerts` | SaaS Alert | SaaS Alerts | master | - | - | - | - | operational_workflow | `:manage` | - |
| 4 | `smp_app_integrations` | `smp_app_integrations` | SaaS App Integration | SaaS App Integrations | master | - | - | - | - | operational_workflow | `:manage` | - |
| 5 | `smp_app_owners` | `smp_app_owners` | SaaS App Owner | SaaS App Owners | master | - | - | - | - | junction | `:manage` | - |
| 6 | `saas_applications` | `saas_applications` | SaaS Application | SaaS Applications | master | - | - | - | - | operational_workflow | `:manage` | - |
| 7 | `shadow_it_apps` | `shadow_it_apps` | Shadow IT App | Shadow IT Apps | master | - | - | - | - | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `shadow_it_apps` | promotes_to | `saas_applications` | one_to_one | reference | no | clear | reference | - |
| `saas_applications` | owns | `smp_app_owners` | many_to_many | reference | - | cascade | parent | - |
| `saas_applications` | integrates_with | `smp_app_integrations` | one_to_many | reference | yes | restrict | reference | - |
| `saas_applications` | publishes | `smp_app_catalog_listings` | one_to_one | reference | yes | restrict | reference | - |
| `saas_applications` | has_alerts | `smp_alerts` | one_to_many | reference | no | clear | reference | - |
| `shadow_it_apps` | has_alerts | `smp_alerts` | one_to_many | reference | no | clear | reference | - |
| `smp_app_lifecycle_stages` | has_stage | `saas_applications` | one_to_one | reference | yes | restrict | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | owns | `saas_applications` | one_to_many | yes | restrict | reference | - |
| `users` | triggered | `shadow_it_apps` | one_to_many | no | clear | reference | - |
| `users` | assigned_owner | `smp_app_owners` | one_to_many | yes | restrict | reference | - |
| `users` | configures | `smp_app_integrations` | one_to_many | yes | restrict | reference | - |
| `users` | curates | `smp_app_catalog_listings` | one_to_many | no | clear | reference | - |
| `users` | triages | `smp_alerts` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `asset_contracts` | covers | `saas_applications` | many_to_many | - | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `saas_applications` | lifecycle events for | `asset_lifecycle_events` | one_to_many | no | - |
| `saas_applications` | has | `saas_subscriptions` | one_to_many | no | - |
| `saas_applications` | measured_by | `saas_usage_metrics` | one_to_many | yes | - |
| `saas_applications` | assigned_via | `smp_license_seat_assignments` | one_to_many | yes | - |
| `saas_applications` | entitles_to | `iga_user_entitlements` | one_to_many | no | - |
| `saas_applications` | has_recommendations | `smp_optimization_recommendations` | one_to_many | no | - |
| `saas_applications` | has_benchmarks | `smp_app_benchmarks` | one_to_many | yes | - |
| `saas_applications` | has_risk_assessments | `smp_vendor_risk_assessments` | one_to_many | yes | - |
| `saas_applications` | has_workflows | `smp_automation_workflows` | one_to_many | no | - |
| `smp_app_catalog_listings` | has_requests | `smp_app_requests` | one_to_many | yes | - |
| `saas_applications` | is registered as | `enterprise_applications` | one_to_one | no | - |
| `saas_applications` | raises_incident | `service_incidents` | one_to_many | no | - |
| `shadow_it_apps` | triggers_requisition | `purchase_requisitions` | one_to_many | no | - |

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

_(none: no other module embeds this scope's masters)_

### 6.2 Outbound handoffs (events this scope publishes)

_(none: no outbound handoffs whose payload is in this scope)_

### 6.3 Inbound handoffs (events this scope reacts to)

_(none: no inbound handoffs whose payload is in this scope)_

### 6.4 Master providers (modules / domains that own masters this scope embeds)

_(none: this scope embeds no masters owned elsewhere; every entity is mastered here)_

## 7. Lifecycle states

### `saas_applications` (SaaS Application)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `discovered` | ✓ | - | - | - | - | App detected via SSO logs, expense data, or browser plugin. Not yet reviewed by IT. |
| 20 | `triaged` | - | - | - | - | - | App has been reviewed by IT but no sanction decision recorded yet. |
| 30 | `sanctioned` | - | - | ✓ | - | `smp-discovery:sanction_application` | App is officially supported; IGA provisioning, FINOPS spend tracking, and ITAM registration activated. |
| 40 | `deprecated` | - | - | ✓ | - | `smp-discovery:deprecate_application` | Slated for replacement or removal; no new assignments allowed; existing users on read-only or sunset path. |
| 50 | `deprovisioned` | - | ✓ | ✓ | - | `smp-discovery:deprovision_application` | App removed tenant-wide. ITSM closes related tickets; IGA revokes access; FINOPS terminates spend. |

### `shadow_it_apps` (Shadow IT App)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `discovered` | ✓ | - | - | - | - | Unsanctioned app surfaced by discovery (expense card, signup detection, network traffic). Awaiting triage. |
| 20 | `triaged` | - | - | - | - | - | IT has reviewed the shadow app and is weighing sanction vs block. |
| 30 | `sanctioned_promoted` | - | ✓ | ✓ | - | `smp-discovery:promote_shadow_app` | Shadow app promoted to the sanctioned catalog; a corresponding saas_applications record is created. |
| 40 | `blocked` | - | ✓ | ✓ | - | `smp-discovery:block_shadow_app` | Shadow app blocked at the network and SSO layer; users notified. |

### `smp_alerts` (SaaS Alert)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `raised` | ✓ | - | - | - | - | - |
| 20 | `acknowledged` | - | - | ✓ | - | `smp-discovery:acknowledge_alert` | - |
| 30 | `triaged` | - | - | ✓ | - | `smp-discovery:triage_alert` | - |
| 40 | `resolved` | - | ✓ | ✓ | - | `smp-discovery:resolve_alert` | - |
| 50 | `suppressed` | - | ✓ | ✓ | - | `smp-discovery:suppress_alert` | - |

### `smp_app_catalog_listings` (App Catalog Listing)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `draft` | ✓ | - | - | - | - | - |
| 20 | `published` | - | - | ✓ | - | `smp-discovery:publish_catalog_listing` | - |
| 30 | `deprecated` | - | - | ✓ | - | `smp-discovery:deprecate_catalog_listing` | - |
| 40 | `unlisted` | - | ✓ | ✓ | - | `smp-discovery:unlist_catalog_listing` | - |

### `smp_app_integrations` (SaaS App Integration)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `configured` | ✓ | - | - | - | - | - |
| 20 | `connected` | - | - | - | - | - | - |
| 30 | `degraded` | - | - | ✓ | - | `smp-discovery:mark_integration_degraded` | - |
| 40 | `disconnected` | - | - | ✓ | - | `smp-discovery:disconnect_integration` | - |
| 50 | `archived` | - | ✓ | ✓ | - | `smp-discovery:archive_integration` | - |

### `smp_app_lifecycle_stages` (App Lifecycle Stage)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `evaluate` | ✓ | - | - | - | - | - |
| 20 | `pilot` | - | - | ✓ | - | `smp-discovery:promote_to_pilot` | - |
| 30 | `sanctioned` | - | - | ✓ | - | `smp-discovery:promote_to_sanctioned` | - |
| 40 | `sunset` | - | - | ✓ | - | `smp-discovery:sunset_app` | - |
| 50 | `retired` | - | ✓ | ✓ | - | `smp-discovery:retire_app` | - |

### `smp_app_owners` (SaaS App Owner)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `active` | ✓ | - | - | - | - | - |
| 20 | `revoked` | - | ✓ | ✓ | - | `smp-discovery:revoke_app_owner` | - |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `smp-discovery:read` | baseline-read | Read access to every entity in the module | ✓ |
| `smp-discovery:manage` | baseline-manage | Edit operational records | ✓ |
| `smp-discovery:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `smp-discovery:read_saas_applications` | entity-read | Read SaaS Applications | ✓ |
| `smp-discovery:write_saas_applications` | entity-write | Write SaaS Applications | ✓ |
| `smp-discovery:read_shadow_it_apps` | entity-read | Read Shadow IT Apps | ✓ |
| `smp-discovery:write_shadow_it_apps` | entity-write | Write Shadow IT Apps | ✓ |
| `smp-discovery:read_smp_app_owners` | entity-read | Read SaaS App Owners | ✓ |
| `smp-discovery:write_smp_app_owners` | entity-write | Write SaaS App Owners | ✓ |
| `smp-discovery:read_smp_app_integrations` | entity-read | Read SaaS App Integrations | ✓ |
| `smp-discovery:write_smp_app_integrations` | entity-write | Write SaaS App Integrations | ✓ |
| `smp-discovery:read_smp_app_catalog_listings` | entity-read | Read App Catalog Listings | ✓ |
| `smp-discovery:write_smp_app_catalog_listings` | entity-write | Write App Catalog Listings | ✓ |
| `smp-discovery:read_smp_alerts` | entity-read | Read SaaS Alerts | ✓ |
| `smp-discovery:write_smp_alerts` | entity-write | Write SaaS Alerts | ✓ |
| `smp-discovery:read_smp_app_lifecycle_stages` | entity-read | Read App Lifecycle Stages | ✓ |
| `smp-discovery:write_smp_app_lifecycle_stages` | entity-write | Write App Lifecycle Stages | ✓ |
| `smp-discovery:sanction_application` | workflow-gate (lifecycle) | Transition `saas_applications` into state `sanctioned` | ✓ |
| `smp-discovery:deprecate_application` | workflow-gate (lifecycle) | Transition `saas_applications` into state `deprecated` | ✓ |
| `smp-discovery:deprovision_application` | workflow-gate (lifecycle) | Transition `saas_applications` into state `deprovisioned` | ✓ |
| `smp-discovery:promote_shadow_app` | workflow-gate (lifecycle) | Transition `shadow_it_apps` into state `sanctioned_promoted` | ✓ |
| `smp-discovery:block_shadow_app` | workflow-gate (lifecycle) | Transition `shadow_it_apps` into state `blocked` | ✓ |
| `smp-discovery:revoke_app_owner` | workflow-gate (lifecycle) | Transition `smp_app_owners` into state `revoked` | ✓ |
| `smp-discovery:mark_integration_degraded` | workflow-gate (lifecycle) | Transition `smp_app_integrations` into state `degraded` | ✓ |
| `smp-discovery:disconnect_integration` | workflow-gate (lifecycle) | Transition `smp_app_integrations` into state `disconnected` | ✓ |
| `smp-discovery:archive_integration` | workflow-gate (lifecycle) | Transition `smp_app_integrations` into state `archived` | ✓ |
| `smp-discovery:publish_catalog_listing` | workflow-gate (lifecycle) | Transition `smp_app_catalog_listings` into state `published` | ✓ |
| `smp-discovery:deprecate_catalog_listing` | workflow-gate (lifecycle) | Transition `smp_app_catalog_listings` into state `deprecated` | ✓ |
| `smp-discovery:unlist_catalog_listing` | workflow-gate (lifecycle) | Transition `smp_app_catalog_listings` into state `unlisted` | ✓ |
| `smp-discovery:acknowledge_alert` | workflow-gate (lifecycle) | Transition `smp_alerts` into state `acknowledged` | ✓ |
| `smp-discovery:triage_alert` | workflow-gate (lifecycle) | Transition `smp_alerts` into state `triaged` | ✓ |
| `smp-discovery:resolve_alert` | workflow-gate (lifecycle) | Transition `smp_alerts` into state `resolved` | ✓ |
| `smp-discovery:suppress_alert` | workflow-gate (lifecycle) | Transition `smp_alerts` into state `suppressed` | ✓ |
| `smp-discovery:promote_to_pilot` | workflow-gate (lifecycle) | Transition `smp_app_lifecycle_stages` into state `pilot` | ✓ |
| `smp-discovery:promote_to_sanctioned` | workflow-gate (lifecycle) | Transition `smp_app_lifecycle_stages` into state `sanctioned` | ✓ |
| `smp-discovery:sunset_app` | workflow-gate (lifecycle) | Transition `smp_app_lifecycle_stages` into state `sunset` | ✓ |
| `smp-discovery:retire_app` | workflow-gate (lifecycle) | Transition `smp_app_lifecycle_stages` into state `retired` | ✓ |

### 8.2 Business rules

_(none: no flag-derived business rules)_

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `SMP-DISCOVERY`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `smp-discovery_viewer` | `smp-discovery:read` |
| `smp-discovery_manager` | `smp-discovery:manage` |
| `smp-discovery_admin` | `smp-discovery:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `smp-discovery:admin` | `smp-discovery:manage` |
| `smp-discovery:manage` | `smp-discovery:read` |
| `smp-discovery:read` | `smp-discovery:read_saas_applications` |
| `smp-discovery:read` | `smp-discovery:read_shadow_it_apps` |
| `smp-discovery:read` | `smp-discovery:read_smp_app_owners` |
| `smp-discovery:read` | `smp-discovery:read_smp_app_integrations` |
| `smp-discovery:read` | `smp-discovery:read_smp_app_catalog_listings` |
| `smp-discovery:read` | `smp-discovery:read_smp_alerts` |
| `smp-discovery:read` | `smp-discovery:read_smp_app_lifecycle_stages` |
| `smp-discovery:manage` | `smp-discovery:write_saas_applications` |
| `smp-discovery:write_saas_applications` | `smp-discovery:read_saas_applications` |
| `smp-discovery:manage` | `smp-discovery:write_shadow_it_apps` |
| `smp-discovery:write_shadow_it_apps` | `smp-discovery:read_shadow_it_apps` |
| `smp-discovery:manage` | `smp-discovery:write_smp_app_owners` |
| `smp-discovery:write_smp_app_owners` | `smp-discovery:read_smp_app_owners` |
| `smp-discovery:manage` | `smp-discovery:write_smp_app_integrations` |
| `smp-discovery:write_smp_app_integrations` | `smp-discovery:read_smp_app_integrations` |
| `smp-discovery:admin` | `smp-discovery:write_smp_app_catalog_listings` |
| `smp-discovery:write_smp_app_catalog_listings` | `smp-discovery:read_smp_app_catalog_listings` |
| `smp-discovery:manage` | `smp-discovery:write_smp_alerts` |
| `smp-discovery:write_smp_alerts` | `smp-discovery:read_smp_alerts` |
| `smp-discovery:manage` | `smp-discovery:write_smp_app_lifecycle_stages` |
| `smp-discovery:write_smp_app_lifecycle_stages` | `smp-discovery:read_smp_app_lifecycle_stages` |
| `smp-discovery:admin` | `smp-discovery:sanction_application` |
| `smp-discovery:admin` | `smp-discovery:deprecate_application` |
| `smp-discovery:admin` | `smp-discovery:deprovision_application` |
| `smp-discovery:admin` | `smp-discovery:promote_shadow_app` |
| `smp-discovery:admin` | `smp-discovery:block_shadow_app` |
| `smp-discovery:admin` | `smp-discovery:revoke_app_owner` |
| `smp-discovery:admin` | `smp-discovery:mark_integration_degraded` |
| `smp-discovery:admin` | `smp-discovery:disconnect_integration` |
| `smp-discovery:admin` | `smp-discovery:archive_integration` |
| `smp-discovery:admin` | `smp-discovery:publish_catalog_listing` |
| `smp-discovery:admin` | `smp-discovery:deprecate_catalog_listing` |
| `smp-discovery:admin` | `smp-discovery:unlist_catalog_listing` |
| `smp-discovery:admin` | `smp-discovery:acknowledge_alert` |
| `smp-discovery:admin` | `smp-discovery:triage_alert` |
| `smp-discovery:admin` | `smp-discovery:resolve_alert` |
| `smp-discovery:admin` | `smp-discovery:suppress_alert` |
| `smp-discovery:admin` | `smp-discovery:promote_to_pilot` |
| `smp-discovery:admin` | `smp-discovery:promote_to_sanctioned` |
| `smp-discovery:admin` | `smp-discovery:sunset_app` |
| `smp-discovery:admin` | `smp-discovery:retire_app` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `manage_it_portfolio_strategy` | Manage IT portfolio strategy | 8.2.2 | 20660 | 3 | Strategy for systematic management of IT investments, projects, and activities. Analyze and examine the value of the IT portfolio and allocate resources based on business objectives. |
| `manage_it_user_identity` | Manage IT user identity and authorization | 8.3.8 | 20756 | 3 | The process of identifying, authenticating, and authorizing IT users to have access to applications, systems, IT components, or networks by associating user rights and restrictions with established identities. |
| `manage_infrastructure_resource` | Manage infrastructure resource administration | 8.7.7 | 20914 | 3 | Managing the resources required for administration of IT infrastructure. Manage the IT inventory and assets. Take care of the organization's IT resource capacity. |
| `manage_corporate_credit_cards` | Manage corporate credit cards | 9.6.3 | 20929 | 3 | Handling and authoring credit cards to business entities or for corporate purchases. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `ITAM-SAAS-PORTFOLIO-MANAGER` | persona | responsible | `manage_it_portfolio_strategy` | the gated entities' write tier |
| `ITAM-SAAS-PORTFOLIO-MANAGER` | persona | accountable | `manage_it_portfolio_strategy` | grant gates [smp-discovery:sanction_application, smp-discovery:deprecate_application, smp-discovery:promote_to_pilot, smp-discovery:promote_to_sanctioned, smp-discovery:sunset_app, smp-discovery:retire_app] + the gated entities' write tier |
| `IT-SAAS-ADMIN` | persona | responsible | `manage_it_user_identity` | the gated entities' write tier |
| `IT-SAAS-ADMIN` | persona | accountable | `manage_it_user_identity` | grant gates [smp-discovery:deprovision_application, smp-discovery:revoke_app_owner] + the gated entities' write tier |
| `IT-SAAS-ADMIN` | persona | responsible | `manage_infrastructure_resource` | the gated entities' write tier |
| `IT-SAAS-ADMIN` | persona | accountable | `manage_infrastructure_resource` | grant gates [smp-discovery:promote_shadow_app, smp-discovery:mark_integration_degraded, smp-discovery:disconnect_integration, smp-discovery:archive_integration, smp-discovery:publish_catalog_listing, smp-discovery:deprecate_catalog_listing, smp-discovery:unlist_catalog_listing, smp-discovery:acknowledge_alert, smp-discovery:triage_alert, smp-discovery:resolve_alert, smp-discovery:suppress_alert] + the gated entities' write tier |
| `IT-SAAS-ADMIN` | persona | responsible | `manage_corporate_credit_cards` | the gated entities' write tier |
| `IT-SAAS-ADMIN` | persona | accountable | `manage_corporate_credit_cards` | grant gates [smp-discovery:block_shadow_app] + the gated entities' write tier |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | IT Asset Management | `admin` | `:admin` |
| contributor | Finance | `manager` | `:manage` |
| contributor | Procurement | `manager` | `:manage` |
