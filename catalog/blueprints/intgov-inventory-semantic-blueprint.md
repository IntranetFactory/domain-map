---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Intranet Content Inventory and Sources
tagline: See every piece of content across all your intranets in one map.
description: Connect SharePoint, Viva, Staffbase, Simpplr, or WordPress and automatically build a living inventory of every page, hub, library, and form. Classify content by type, score its health and accessibility, and know exactly what exists before you decide what to fix.
system_slug: intgov-inventory
domain_modules:
  - intgov-inventory
domain_code: INTRANET-GOV
related_modules: [intgov-governance]
persona: []
supports_raci: false
created_at: 2026-11-04
---

# Intranet Content Inventory and Sources

## 1. Overview

Connector registry, cross-platform content inventory, content-type policy, and health scoring.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Connected Intranets | `connected_intranets` | Source intranet platforms under governance, with platform type, base URL, authentication, crawl schedule, and status. |
| Content Health Scores | `intranet_content_health_scores` | Derived per-item scores for freshness, quality, accessibility, and ownership coverage of intranet content. |
| Content Inventory Records | `intranet_content_inventory_records` | Discovered or registered pieces of intranet content (pages, hubs, libraries, forms) with source, type, owner, and governance status. |
| Intranet Content Types | `intranet_content_types` | Governed content-type definitions (policy, news post, hub, library, form, FAQ) carrying default review cadence, criticality, and retention rule. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  connected_intranets["Connected Intranets"]
  intranet_content_inventory_records["Content Inventory Records"]
  intranet_content_types["Intranet Content Types"]
  intranet_content_health_scores["Content Health Scores"]
  connected_intranets -->|"contains"| intranet_content_inventory_records
  intranet_content_types -->|"classifies"| intranet_content_inventory_records
  intranet_content_inventory_records -->|"is scored by"| intranet_content_health_scores
  class connected_intranets master;
  class intranet_content_inventory_records master;
  class intranet_content_types master;
  class intranet_content_health_scores master;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `connected_intranets` | `connected_intranets` | Connected Intranet | Connected Intranets | master | - | - | - | - | catalog | `:admin` | - |
| 2 | `intranet_content_health_scores` | `intranet_content_health_scores` | Content Health Score | Content Health Scores | master | - | - | - | - | computed | read-only | - |
| 3 | `intranet_content_inventory_records` | `intranet_content_inventory_records` | Content Inventory Record | Content Inventory Records | master | - | - | - | - | operational_record | `:manage` | - |
| 4 | `intranet_content_types` | `intranet_content_types` | Intranet Content Type | Intranet Content Types | master | - | - | - | - | catalog | `:admin` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `connected_intranets` | contains | `intranet_content_inventory_records` | one_to_many | composition | yes | cascade | parent | - |
| `intranet_content_types` | classifies | `intranet_content_inventory_records` | one_to_many | reference | yes | restrict | reference | - |
| `intranet_content_inventory_records` | is scored by | `intranet_content_health_scores` | one_to_one | composition | yes | cascade | parent | - |

### 5.2 Relationships to platform built-ins (`users`)

_(none: no relationships to platform built-ins)_

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

_(none: no outgoing relationships to external entities)_

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `intranet_content_inventory_records` | is governed by | `intranet_content_ownership_assignments` | one_to_many | yes | - |
| `intranet_content_inventory_records` | is attested by | `intranet_content_attestations` | one_to_many | yes | - |
| `intranet_content_inventory_records` | spawns improvement | `work_items` | one_to_many | no | - |

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

_(none: no lifecycle states for the entities in this scope)_
## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `intgov-inventory:read` | baseline-read | Read access to every entity in the module | ✓ |
| `intgov-inventory:manage` | baseline-manage | Edit operational records | ✓ |
| `intgov-inventory:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `intgov-inventory:read_connected_intranets` | entity-read | Read Connected Intranets | ✓ |
| `intgov-inventory:write_connected_intranets` | entity-write | Write Connected Intranets | ✓ |
| `intgov-inventory:read_intranet_content_inventory_records` | entity-read | Read Content Inventory Records | ✓ |
| `intgov-inventory:write_intranet_content_inventory_records` | entity-write | Write Content Inventory Records | ✓ |
| `intgov-inventory:read_intranet_content_types` | entity-read | Read Intranet Content Types | ✓ |
| `intgov-inventory:write_intranet_content_types` | entity-write | Write Intranet Content Types | ✓ |
| `intgov-inventory:read_intranet_content_health_scores` | entity-read | Read Content Health Scores | ✓ |

### 8.2 Business rules

_(none: no flag-derived business rules)_

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `INTGOV-INVENTORY`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `intgov-inventory_viewer` | `intgov-inventory:read` |
| `intgov-inventory_manager` | `intgov-inventory:manage` |
| `intgov-inventory_admin` | `intgov-inventory:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `intgov-inventory:admin` | `intgov-inventory:manage` |
| `intgov-inventory:manage` | `intgov-inventory:read` |
| `intgov-inventory:read` | `intgov-inventory:read_connected_intranets` |
| `intgov-inventory:read` | `intgov-inventory:read_intranet_content_inventory_records` |
| `intgov-inventory:read` | `intgov-inventory:read_intranet_content_types` |
| `intgov-inventory:read` | `intgov-inventory:read_intranet_content_health_scores` |
| `intgov-inventory:admin` | `intgov-inventory:write_connected_intranets` |
| `intgov-inventory:write_connected_intranets` | `intgov-inventory:read_connected_intranets` |
| `intgov-inventory:manage` | `intgov-inventory:write_intranet_content_inventory_records` |
| `intgov-inventory:write_intranet_content_inventory_records` | `intgov-inventory:read_intranet_content_inventory_records` |
| `intgov-inventory:admin` | `intgov-inventory:write_intranet_content_types` |
| `intgov-inventory:write_intranet_content_types` | `intgov-inventory:read_intranet_content_types` |

**RACI realization:**

_(none: no process_raci assignments wired to this module's gated processes yet)_

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Human Resources | `admin` | `:admin` |
| owner | IT Operations | `admin` | `:admin` |
| contributor | Marketing Communications | `manager` | `:manage` |
| consumer | Executive | `viewer` | `:read` |
