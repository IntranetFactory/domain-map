# `held_as` summary column recheck

Read-only, 2026-11-03. Compares `domain_data_objects.held_as` with the strongest `domain_module_data_objects.held_as` in that domain (rule: module-shape.md, "strongest wins"), ranked master > embedded_master > contributor > consumer > derived.

- Summary rows: 1290. Matching the strongest module value: 956. Differing: 26.
- Summary rows with no module row: 308, of which 22 are in domains that have modules.
- Domain and entity pairs with module rows but no summary row: 869.

## Differing rows

| domain | entity | summary says | strongest in modules | all module values |
| --- | --- | --- | --- | --- |
| ATS | `background_checks` | master | embedded_master | embedded_master |
| PAYROLL | `employees` | master | embedded_master | embedded_master |
| IGA | `employees` | master | consumer | consumer |
| SWP | `hcm_positions` | contributor | consumer | consumer |
| HRSD | `service_requests` | consumer | embedded_master | embedded_master |
| ITSM | `asset_lifecycle_events` | contributor | embedded_master | embedded_master |
| SMP | `legal_contracts` | contributor | embedded_master | embedded_master |
| ITSM | `configuration_items` | consumer | embedded_master | embedded_master |
| ITSM | `monitoring_alerts` | consumer | embedded_master | embedded_master,consumer |
| CSM | `customers` | master | consumer | consumer |
| CDP | `customers` | master | embedded_master | embedded_master |
| HRSD | `knowledge_articles` | consumer | embedded_master | embedded_master,consumer |
| HRSD | `employees` | consumer | embedded_master | embedded_master |
| FIN | `revenue_recognition_records` | master | embedded_master | embedded_master |
| RMM | `monitoring_policies` | master | embedded_master | embedded_master |
| RMM | `monitoring_alerts` | master | embedded_master | embedded_master |
| BPA | `business_capability_maps` | master | embedded_master | embedded_master |
| SPM | `strategic_initiatives` | master | embedded_master | embedded_master |
| DCG | `metric_definitions` | master | embedded_master | embedded_master |
| DCG | `data_products` | master | embedded_master | embedded_master |
| DCG | `ontologies` | master | embedded_master | embedded_master |
| RE-BROKERAGE | `crm_contacts` | contributor | embedded_master | embedded_master |
| RE-BROKERAGE | `crm_leads` | contributor | embedded_master | embedded_master |
| RE-INVEST | `capital_calls` | master | embedded_master | embedded_master |
| RE-INVEST | `fund_distributions` | master | embedded_master | embedded_master |
| FARMER-DIRECT-SALES | `customers` | contributor | embedded_master | contributor,consumer,embedded_master |
