# DISCOVERY Phase 0 — Vendor Surface (2026-06-08)

Market confirmed from the live domain (id 5): **Discovery and Service Mapping** — IT infrastructure discovery. The product scans networks, queries cloud APIs, and runs credentialed inspection to build a continuously-refreshed inventory, fingerprints each asset, and maps components into business services, then feeds clean records downstream into the CMDB, asset registers (HAM/SAM/ITAM), and ITOM. This is NOT data discovery or sales discovery. Live masters (`discovery_scans`, `discovered_devices`, `discovery_sources`) match the IT-infrastructure-discovery hypothesis, so the candidate vendor set is correct.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| ServiceNow Discovery + Service Mapping | servicenow.com (docs) | Pattern-based agentless + MID-Server discovery feeding the CMDB; Service Mapping as a distinct premium SKU | The suite leader; pattern engine (NDL) + probes/sensors; cleanest "discovery populates CMDB" split |
| Device42 | device42.com (docs) | Agentless auto-discovery + application dependency mapping across physical/virtual/cloud | Pure-play discovery + ADM; own CMDB; broad cloud-API coverage (AWS/Azure/GCP/OCI/Alibaba) |
| Lansweeper Discovery | lansweeper.com (docs) | All-in-one IT/OT/IoT/cloud inventory; active + passive + credential-free fingerprinting | Inventory leg; encrypted on-prem credential vault; 2025 RedJack acquisition added passive network discovery + ADM |
| BMC Helix Discovery (ADDM lineage) | docs.bmc.com (DISCO 25.2) | Agentless network + cloud + Kubernetes discovery; pattern-driven; dependency mapping | The ADDM heritage product; credential-broker integration; "scan" is a first-class historized object (topology snapshot) |
| runZero | runzero.com (help) | Unauthenticated active scanning + passive traffic sampling; cyber asset discovery | Passive/unauthenticated network-scan specialist; "scan task" + scan template are first-class; OT/IoT coverage |
| Axonius (CAASM, boundary reference) | axonius.com / docs.axonius.com | Cyber-asset aggregation across 1,200+ adapters; reconciled asset model; coverage-gap detection | NOT a scanner — included as the boundary control: it CONSUMES discovery sources and masters the aggregated asset, defining the downstream edge |

## Surface matrix

Columns: SN=ServiceNow, D42=Device42, LS=Lansweeper, BMC=BMC Helix Discovery, rZ=runZero, Ax=Axonius (CAASM). "(c)" = consumes/aggregates rather than masters.

| Entity | Category | SN | D42 | LS | BMC | rZ | Ax | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| discovery_scans (scan run / topology snapshot / scan task) | Master | Y | Y | Y | Y | Y | - | Core | DISCOVERY-NETWORK-SCAN |
| discovered_devices (CI candidate / asset record) | Master | Y | Y | Y | Y | Y | (c) | Core | DISCOVERY-NETWORK-SCAN |
| discovery_sources (collectors / MID servers / explorers / connectors) | Master | Y | Y | Y | Y | Y | Y | Core | DISCOVERY-NETWORK-SCAN |
| discovery_credentials (SNMP/SSH/WinRM/WMI/cloud keys/K8s tokens) | Config | Y | Y | Y | Y | Y | (c) | Core | DISCOVERY-NETWORK-SCAN |
| discovery_patterns (classifier patterns / auto-discovery rules) | Config | Y | Y | Y | Y | - | - | Core | DISCOVERY-NETWORK-SCAN |
| discovery_schedules (scan schedules / recurrences) | Config | Y | Y | Y | Y | Y | - | Core | per realizing module |
| discovery_exclusions (IP/subnet/OU scope exclusions) | Config | Y | Y | Y | Y | Y | - | Core | per realizing module |
| network_segments / scan scope (CIDR / IP range / ASN) | Config | Y | Y | Y | Y | Y | - | Core | DISCOVERY-NETWORK-SCAN |
| cloud_accounts (subscriptions / projects scanned) | Master/Config | Y | Y | Y | Y | Y | (c) | Core | DISCOVERY-CLOUD-INVENTORY |
| cloud_resources (discovered cloud objects) | Master | Y | Y | Y | Y | Y | (c) | Core | DISCOVERY-CLOUD-INVENTORY |
| discovered_services (network services / ports) | Master | Y | Y | Y | Y | Y | (c) | Core | DISCOVERY-NETWORK-SCAN |
| service_maps / dependency maps (ADM topology) | Master | Y(SM SKU) | Y | Y(RedJack) | Y | - | - | Core | DISCOVERY-SERVICE-MAPPING |
| reconciliation_rules (IRE / normalization rules) | Config | Y | Y | (c) | Y | - | Y | Common | DISCOVERY-RECONCILIATION |
| configuration_items (the CMDB CI) | Downstream | (c) | (c) | (c) | (c) | - | (c) | (CMDB-mastered) | consume only |
| asset_tags / labels | Config | Y | Y | Y | Y | Y | Y | Common | DISCOVERY-RECONCILIATION (or cross-cutting) |
| ssl_certificates / fingerprints | Master | - | Y | Y | - | Y | (c) | Common | DISCOVERY-NETWORK-SCAN |

Classification key: Core = >=3 vendors master it; Common = 2 master it (or split master/consume); Compliance = regulation-required.

## Compliance entities (non-optional)

None. IT-infrastructure discovery has **no statutory gate of its own**. There is no FCRA / HIPAA / GDPR / SOX / PCI entity the market mandates. Discovered data flows downstream into systems that ARE regulated (the CMDB is GDPR-scoped for any host that holds personal data; financial-control endpoints are SOX-scoped), but the applicability attaches to those downstream domains, not to DISCOVERY: the domain collects technical inventory (IPs, hostnames, OS, ports, certs), and that inventory inherits downstream applicability rather than gating discovery itself. So `domain_regulations` for DISCOVERY is legitimately empty / very light, unlike a regulated market.

## Modularization hypothesis

The flagship products package the surface into a small number of marketed sub-areas, which grounds a 3-module shape as the recommended default:

1. **DISCOVERY-NETWORK-SCAN** — the network-probe substrate. Masters `discovery_scans`, `discovered_devices`, `discovery_sources` and carries the scan config (credentials, patterns, schedules, exclusions, network segments, discovered services). Every vendor packages this as "Discovery" core: ServiceNow Discovery (probes/sensors + patterns), BMC Helix Discovery (network/SNMP/remote-command scans), runZero (active + passive scan tasks), Lansweeper Discovery (active/passive/credential-free).

2. **DISCOVERY-CLOUD-INVENTORY** — cloud-API discovery. Masters `cloud_accounts` and `cloud_resources` discovered via cloud APIs rather than network probes. The vendors market this as a distinct surface: Device42 cloud autodiscovery (AWS/Azure/GCP/OCI/Alibaba/etc.), ServiceNow Cloud Discovery, Lansweeper Cloud Discovery (150+ cloud asset types), BMC Helix cloud-native discovery. Different collection mechanism (API keys, not credentialed network probes) and a different boundary (subscription/project, not subnet) justify the split.

3. **DISCOVERY-SERVICE-MAPPING** — application/service dependency mapping. The topology layer that turns discovered devices + services into business-service maps. ServiceNow sells **Service Mapping as a separate premium SKU** on the Discovery line; Device42 ships ADM; Lansweeper added ADM via the 2025 RedJack acquisition; BMC ADDM (the "DD" in the original name) frames dependency mapping as part of the product. Pulling it into its own module triangulates against the existing `service_maps` master in CMDB-SERVICE-MAPPING (see the masters-vs-consumes call below).

A 4th module, **DISCOVERY-RECONCILIATION** (normalization + reconciliation rules that map a `discovered_device` into a `configuration_item`), is defensible but borderline: ServiceNow IRE rules, Device42 reconciliation, BMC normalization, and Axonius reconciliation logic all exist, but several vendors fold reconciliation into the core discovery engine rather than marketing it separately, and the CMDB side also owns a large slice of normalization. Recommend keeping reconciliation_rules as a config entity inside an existing module (or a `b3` follow-up) rather than a 4th module, unless the user wants CAASM-style "discovery rules" prominence.

### Masters vs consumes (the key boundary calls, vendor-grounded)

- **DISCOVERY masters** the collection plane: `discovery_scans` (the scan run / topology snapshot / scan task — first-class historized in SN, BMC, runZero, Device42, Lansweeper), `discovered_devices` (the raw CI candidate / asset record before reconciliation), `discovery_sources` (the collectors: MID servers, Explorers, connectors), and the scan config (credentials, patterns, schedules, exclusions, scope). This is unambiguous: every scanning vendor owns these as first-class objects.
- **DISCOVERY consumes / feeds (does NOT master)** the `configuration_items` in the CMDB. In ServiceNow the canonical split is explicit: Discovery *populates* the CMDB; the CI is a CMDB object. Device42, Lansweeper, and BMC each ship their own CMDB, but the discovered-device-to-CI promotion is a downstream reconciliation step — the CI is the reconciled record, not the raw discovery output. So `configuration_items` stays CMDB-mastered and DISCOVERY is a contributor/consumer.
- **service_maps**: contested but lands on CMDB-mastered. ServiceNow sells Service Mapping on the Discovery line, but markets the *result* (the service map / application service) as a CMDB asset; BMC frames ADM as part of discovery yet the dependency model lives in the CMDB graph. Recommend DISCOVERY publishes `discovery_scan.completed` (already wired) and CMDB-SERVICE-MAPPING continues to canonically master `service_maps`; a DISCOVERY-SERVICE-MAPPING module would carry `consumer`/`derived` rows, not a master, unless the user wants DISCOVERY to take ownership.
- **The CAASM boundary** (Axonius): Axonius does NOT scan — it aggregates from 1,200+ adapters and reconciles into one asset model, explicitly "without deploying new agents or running manual scans." That makes CAASM a *consumer* of discovery sources and a master of the aggregated/reconciled asset, which is a separate (queued) domain. It confirms that DISCOVERY's master set stops at the raw scan/device/source layer and does not extend into the aggregated-asset-of-record layer.
