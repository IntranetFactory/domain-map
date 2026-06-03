# VET-PRACT-MGMT audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 modules, 5 masters, 1 contributor (supplier_invoices, mastered by S2P), 6 capabilities, 9 solutions, 0 lifecycle states, 0 aliases, 2 data_object_relationships (both outbound to `customer_cases` in CSM, no intra-domain edges, no users edges), 4 regulations linked (DEA CSA, State Veterinary Practice Acts, PCI-DSS, SOC 2), 6 outbound handoffs, 0 inbound handoffs, 1 legacy `skills` row (`vet-pract-mgmt-system`, `domain_module_id=null`), 6 `skill_tools` rows (5 `query` + 1 `side_effect` send_email).
- **Vendor-surface basis:** IDEXX Cornerstone (Henry Schein / IDEXX, US flagship), ezyVet (IDEXX Cloud), AVImark (Covetrus, US legacy/desktop), ImproMed (Henry Schein/Covetrus), Vetspire (cloud-native US), Provet Cloud (Nordic/EU), NaVetor (Patterson Veterinary), Hippo Manager (SMB cloud), Shepherd Veterinary Software (DEI-friendly cloud). Catalog already enumerates 9 primary solutions; the matrix covers US specialty/general-practice clinics and EU/Nordic shape. A controlled-substance compliance specialist (LogicaDOC, Cubex / RxWorks add-ons) is typically embedded inside the PIMS rather than sold standalone, so no separate compliance specialist row in the catalog.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.
- **Cross-domain handoff count (N):** 6 outbound, 0 inbound. APQC expectation: 3-5 new `agent_curated` tags surfaced in Bucket 1 H1; ~1-2 deferred to Discover. Currently 0 `handoff_processes` rows exist on any VET-PRACT-MGMT handoff (0 approved, 0 agent_curated).
- **Structural gate state:** **M1 hard fail** (zero `domain_modules`). Per the audit recipe, the M-band blocks every downstream concern; B/C/E/F findings below are surfaced for completeness, but every Bucket 1 structural fix that references modules is gated behind authoring the module set first.

### Pass 1 - Structural (per-domain completeness checklist)

#### S-band coverage sweep

**S1. FK-to-`domains` coverage for VET-PRACT-MGMT (id=151).**

| Table | FK column | VET-PRACT-MGMT rows | Expected non-zero? |
| --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 6 (5 master + 1 contributor) | Yes (B1) - pass |
| `solution_domains` | `domain_id` | 9 (all `primary`) | Yes (A3) - pass |
| `business_function_domains` | `domain_id` | 4 (owner + 2 contributors + 1 consumer) | Yes (C1) - pass |
| `capability_domains` | `domain_id` | 6 | Yes (A2) - pass |
| `domain_regulations` | `domain_id` | 4 | Yes - pass |
| `domains.parent_domain_id` | n/a (this row) | n/a (null) | Routinely zero - pass |
| `handoffs.source_domain_id` | `source_domain_id` | 6 | Yes (B9) - pass |
| `handoffs.target_domain_id` | `target_domain_id` | 0 | Usually yes - **anomaly** (no inbound captured) |
| `skills.domain_id` | `domain_id` | 1 (legacy, `domain_module_id=null`) | F2: exactly one per module - **FAIL** (no modules) |
| `domain_modules.domain_id` | `domain_id` | 0 | Yes (M1) - **HARD FAIL** |
| `domain_module_host_domains.domain_id` | `domain_id` | 0 | Routinely zero - pass |
| `domain_aliases.domain_id` | `domain_id` | 0 | Optional - pass |

**S2. Indirect-table per-module coverage.** N/A (no modules). The zero-module condition makes S2 vacuously empty; routes to M1.

**S3. Per-master indirect-table coverage.**

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `animal_patients` | 0 | 1 (`animal_patient.appointment_due`) | 0 |
| `pet_owners` | 0 | 1 (`pet_owner.registered`) | 0 |
| `veterinary_vaccinations` | 0 | 2 (`veterinary_vaccination.administered`, `veterinary_vaccination.due`) | 0 |
| `veterinary_lab_results` | 0 | 1 (`veterinary_lab_result.critical`) | 0 |
| `controlled_substance_ledger_entries` | 0 | 1 (`controlled_substance.dispensed`) | 0 |

Every master is at zero states + zero aliases. Routes to B12 (lifecycle), B11 (aliases). Trigger events are reasonably populated (6 events across 5 masters), but `event_category` is empty on 4 of 6 events (see B9 finding).

#### A-band - Market shape

- **A1.** `domains` row has all 7 business-metadata fields populated. `crud_percentage=85`, `business_logic` non-empty (covers species/breed weight-based dosing, DEA Schedule II-V ledger reconciliation, reminder protocols, multi-pet visit consolidation, lab trending, boarding overlap), `min_org_size='10 xs <50'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=600`, `market_size_source_year=2024`. PASS.
- **A2.** 6 capabilities linked: VET-PATIENT-CARE, VET-APPT-SCHED, VET-INVOICING, VET-INVENTORY-RX, VET-LAB-INTEGRATION, VET-REMINDER-MGMT. PASS (>=3 floor).
- **A3.** 9 solutions linked, all `coverage_level='primary'`. PASS. (Worth noting for the user: an all-`primary` distribution is unusual; secondaries/partials could be added for cross-market suites like ERP-FIN extensions, but not a structural fail.)
- **A4.** `catalog_tagline` and `catalog_description` are both empty. **FAIL** - Bucket 2 (Rule #20 requires user-approved buyer-voice wording before write).
- **A5.** Skip per default (not requested).

#### M-band - Modules (Rule #14) - STRUCTURAL GATE

- **M1.** Zero `domain_modules` rows for `domain_id=151`. **HARD FAIL.** This is the dominant structural gate. With 6 capabilities, M2 requires >=2 full modules. The 5 masters cluster cleanly into module candidates (see Bucket 2 module-shape decision).
- **M2.** Vacuous (no modules). Would require >=2 once modules are loaded.
- **M4 - M7.** All vacuous until M1 is cured.

#### B-band - Data-object footprint

- **B1.** 5 master rows. PASS.
- **B2.** Every master has `singular_label` and `plural_label`. PASS.
- **B3.** All 5 masters have prefixed names (`animal_patients`, `pet_owners`, `veterinary_vaccinations`, `veterinary_lab_results`, `controlled_substance_ledger_entries`); none are bare words. `is_canonical_bare_word=false` on all. PASS.
- **B4.** All 5 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Positive re-evaluation: `pet_owners` carries human PII (name, address, payment instrument linkages) and arguably warrants `has_personal_content=true`; `controlled_substance_ledger_entries` carries DEA-regulated dispense records with veterinarian attribution and is a strong candidate for `has_submit_lock=true` (post-dispense the ledger row is append-only per DEA recordkeeping rules). Surfaced to Bucket 2 for explicit confirmation per Rule #12.
- **B5.** No `embedded_master` rows for this domain. PASS (vacuously).
- **B6.** Zero intra-domain `data_object_relationships`. **FAIL.** Workflow ties are absent: `pet_owners -> animal_patients` (owns), `animal_patients -> veterinary_vaccinations` (received), `animal_patients -> veterinary_lab_results` (sampled), `veterinary_vaccinations -> controlled_substance_ledger_entries` (drew_from, when controlled-substance anesthetics are involved), `animal_patients -> controlled_substance_ledger_entries` (administered_to). All five masters are intra-domain isolated. Two existing rows (animal_patients/veterinary_vaccinations `opens` `customer_cases`) point cross-domain to CSM and are correctly outbound, but the within-domain edges are missing. Bucket 1.
- **B7.** Zero `users` edges. **FAIL.** Expected user-actor edges: `animal_patients.primary_veterinarian`, `veterinary_vaccinations.administered_by`, `veterinary_lab_results.ordered_by`, `controlled_substance_ledger_entries.dispensed_by` (DEA-attributed), `pet_owners.account_owner` (client-services rep). Bucket 1.
- **B8.** 2 outbound cross-domain `data_object_relationships` exist (`animal_patients opens customer_cases`, `veterinary_vaccinations opens customer_cases`) but 6 outbound handoffs exist (see B9). Missing mirrors: `controlled_substance_ledger_entries -> GRC` payload (DEA reporting), `controlled_substance_ledger_entries -> SUP-LIFE` payload (supplier reorder trigger), `pet_owners -> ERP-FIN` payload (AR profile creation), `veterinary_lab_results -> GRC` payload (reportable-disease logs). Bucket 1.
- **B9.** 6 outbound `trigger_events` + 6 outbound `handoffs` rows. Every master has at least one event. Of the 6 events, 4 carry `event_category=''` (empty string). The valid enum values are `lifecycle`, `state_change`, `threshold`, `signal`. The two correctly categorized: `controlled_substance.dispensed` (`lifecycle`), `animal_patient.appointment_due` (`threshold`). The four to PATCH: `pet_owner.registered` (`lifecycle`), `veterinary_vaccination.administered` (`lifecycle`), `veterinary_vaccination.due` (`threshold`), `veterinary_lab_result.critical` (`signal`). Bucket 1.

  Note: trigger event `veterinary_vaccination.administered` (id=1088) has NO `handoffs` row. The event's own description says CSM schedules the next-dose reminder and GRC logs rabies-tag reporting. Bucket 1.

  Outbound table:

  | handoff_id | event_name | data_object | target | pattern | friction | source_module_FK | target_module_FK |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 335 | `controlled_substance.dispensed` | `controlled_substance_ledger_entries` | GRC | batch_sync | medium | NULL | NULL |
  | 336 | `controlled_substance.dispensed` | `controlled_substance_ledger_entries` | SUP-LIFE | api_call | low | NULL | NULL |
  | 337 | `animal_patient.appointment_due` | `animal_patients` | CSM | api_call | low | NULL | NULL (CSM has modules) |
  | 946 | `pet_owner.registered` | `pet_owners` | ERP-FIN | event_stream | low | NULL | NULL |
  | 947 | `veterinary_vaccination.due` | `veterinary_vaccinations` | CSM | api_call | medium | NULL | NULL (CSM has modules) |
  | 948 | `veterinary_lab_result.critical` | `veterinary_lab_results` | GRC | event_stream | medium | NULL | NULL |

- **B9b.** Skipped (no modules; <2 module floor). When modules are authored, intra-domain cross-module handoffs need to be drafted (e.g. exam -> invoice on visit close; lab-result-critical -> patient-record annotation if these end up in separate modules).
- **B10.** Inbound report-only. Zero inbound handoff rows. The catalog suggests the following candidate inbound dependencies via the contributor row:
  - `supplier_invoices` (id=75, role=contributor, necessity=required) is mastered by S2P (id=27). S2P invoice-approval / drug-supplier lifecycle changes would be a natural inbound handoff but no such row is loaded. Report-only: S2P B9 owes outbound on `supplier_invoices` to VET-PRACT-MGMT (this domain's contributor + required) for AP-style finalization.
  - Implicit: lab-results integration suggests inbound from a clinical-lab-system domain (IDEXX VetConnect Plus, Antech Lab), but no such domain exists in the catalog today (see Pass 2 modularization commentary; lab connectors are typically integrations, not first-class domains).
- **B10b.** Every handoff in B9 has `source_domain_module_id=NULL`; source side is owed by THIS domain once M1 is cured. Target side `target_domain_module_id=NULL` on all 6; for CSM-target rows (337, 947) the target side is owed by CSM B10b (CSM has 3 modules: CSM-CASE-MGMT, CSM-ENTITLEMENTS, CSM-KNOWLEDGE; the natural target module is CSM-CASE-MGMT). GRC, SUP-LIFE, ERP-FIN are all unmodularized today (M1 failures on each); their target-side fix lands when each is modularized. Bucket 1 (source side); Report-only (target side per each partner's B10b).
- **B11.** Zero aliases on any master. Expected cross-vendor / cross-industry synonyms: `animal_patients` <-> "patient", "pet patient", "animal" (vet-vernacular); `pet_owners` <-> "client" (the universal PIMS term: IDEXX/ezyVet/AVImark all call them "Client", not "Pet Owner"), "owner"; `veterinary_vaccinations` <-> "vaccine record", "immunization"; `veterinary_lab_results` <-> "diagnostics result", "lab test", "in-house cytology"; `controlled_substance_ledger_entries` <-> "DEA log entry", "Schedule drug log", "C2-5 ledger". The "Client" alias for `pet_owners` is a near-universal IDEXX/AVImark term and is the most load-bearing. Bucket 1.
- **B12.** Zero `data_object_lifecycle_states` across all 5 masters. **FAIL.** Most have observable state machines:
  - `animal_patients`: active / inactive / deceased / transferred (clinic-to-clinic transfer is a real workflow).
  - `pet_owners`: prospective / active / collections / inactive.
  - `veterinary_vaccinations`: scheduled / administered / due / overdue / waived (client-declined).
  - `veterinary_lab_results`: ordered / sampled / received / reviewed / critical / archived.
  - `controlled_substance_ledger_entries`: drawn / dispensed / wasted / reconciled / discrepancy-flagged (DEA Form 41 wastage path).

  Bucket 1.

#### C-band - Functional ownership

- **C1.** 4 `business_function_domains` rows: owner=`Business Operations` (id=34), contributor=`Customer Service` (id=24), contributor=`Accounts Receivable` (id=45), consumer=`Compliance Operations` (id=73). PASS.
- **C2.** Zero `business_function_capabilities` overrides. Plausible overrides:
  - `VET-INVOICING` is closer to `Accounts Receivable` than `Business Operations`.
  - `VET-INVENTORY-RX` is closer to `Compliance Operations` (DEA controlled-substance management) than pure Operations.
  - `VET-REMINDER-MGMT` is closer to `Customer Service` (multi-channel outreach).

  Surfaced to Bucket 2 for explicit decision.

#### D-band - UI spot-check

- **D1.** Not run as part of this audit pass. Standard URL pattern: `https://tests.semantius.app/domain_map/<table>`.

#### E-band - Roles and permission bundling

- **E1 - E6.** All vacuous until M1 is cured. Single-module domains pass E1 vacuously; >=2-module domains need >=3 roles. VET-PRACT-MGMT's typical personas: Veterinarian (DEA-authorized prescriber), Veterinary Technician, Practice Manager, Front-Desk / Client-Services Rep, Inventory Lead (controlled-substance custodian). To be authored after modules.

#### F-band - Skill-layer integrity

- **F1.** 1 legacy `skills` row (`vet-pract-mgmt-system`, id=116) with `domain_module_id=null`. Acceptable transitional state ONLY because no module-level skill exists yet. Once modules are authored, this legacy row must be retired (DELETE) or split into module-level skills (one `<module_code_lower>_agent` per module). Bucket 1.
- **F2.** Zero module-level system skills (vacuous: no modules). **FAIL** (gated by M1).
- **F3.** Legacy skill has 6 `skill_tools` rows: 5 `query` (one per master, all `coverage_tier='platform'`) plus 1 `side_effect` (`send_email`, `coverage_tier='platform'`). The tool set is thin: zero `mutate`, zero workflow gates, zero `fetch` (vendor APIs like IDEXX VetConnect Plus, Antech lab pull), zero `inbound` (webhook-style lab-result push, payment-gateway settlement webhook). Once modules are split, these tools must be redistributed across per-module skills. Bucket 1.
- **F4.** All 6 linked tools pair `operation_kind` and `data_object_id` correctly (5 `query` rows have `data_object_id` set; the `send_email` row is `side_effect` with `data_object_id=null`). PASS on the invariant.
- **F5.** Semantius score uncomputable (no modules). Routes to F2 + F3.
- **F7.** `send_email` is a channel primitive linked to the legacy skill. Per the channel-vs-capability authoring rule, the default for generic notifications is `notify_person`; reminder outreach for vaccination-due, appointment-due, and lab-critical events is a substitutable channel (SMS, email, app-push all valid per IDEXX/ezyVet capability). When modules are split and the legacy skill is retired, the per-module skill that handles reminders should link `notify_person` rather than `send_email` directly, unless the workflow actually requires email specifically (e.g. a regulatory-mandated email confirmation, which is not the case here). Bucket 1.

#### H-band - APQC coverage

- **H1.** Zero `handoff_processes` rows on any VET-PRACT-MGMT handoff. **FAIL.** Six cross-domain handoffs need APQC PCF activity classification. Bucket 1 (see APQC TAGGING table below).

  Catalog-quality headline: 0 of 6 handoffs carry an `approved` tag (0% coverage). Process-health side-bar: 0 `agent_curated` rows exist; this audit proposes 4 new ones below with 2 deferred to Discover.

### Pass 2 - Market audit (semantic)

Vendor surface enumerated from flagship-vendor knowledge plus the 9 already-loaded solutions. VET-PRACT-MGMT is a stable, mature market with a tight feature spine (PIMS = Practice Information Management System). Vendors cluster around three buying axes: (1) cloud-native general practice (ezyVet, Vetspire, Provet Cloud, NaVetor, Hippo Manager, Shepherd) targeting solo + 2-5 site clinics; (2) legacy desktop/server (AVImark, ImproMed) on the larger multi-site cooperative side; (3) reference-laboratory-integrated suites (IDEXX Cornerstone, which is the dominant US standard at ~50% market share). Compliance specialists for DEA Schedule II-V are typically embedded modules inside the PIMS rather than separately-sold (Cubex narcotic-dispense cabinets push events into the PIMS ledger; the ledger model itself is PIMS-native).

**MISSING entities** (in market surface, not in catalog footprint):

| entity | category | flagship evidence | proposed cluster | compliance basis |
| --- | --- | --- | --- | --- |
| `veterinary_appointments` | master | IDEXX Cornerstone appointment book, ezyVet calendar, AVImark scheduler | VET-PRACT-MGMT-APPOINTMENTS | - |
| `veterinary_exam_notes` | master | IDEXX SOAP notes, ezyVet clinical-records, Vetspire SOAP editor | VET-PRACT-MGMT-PATIENT-CARE | State Vet Practice Acts (medical-records retention) |
| `veterinary_prescriptions` | master | IDEXX Rx pad, ezyVet e-Rx, Cubex Rx | VET-PRACT-MGMT-INVENTORY-RX | DEA CSA (Schedule II-V Rx) |
| `vet_drug_inventory_items` | master | AVImark inventory, ezyVet stock control, IDEXX Inventory Pro | VET-PRACT-MGMT-INVENTORY-RX | DEA CSA (controlled inventory tracking) |
| `vet_invoices` | master | IDEXX Invoicing, ezyVet billing, AVImark POS | VET-PRACT-MGMT-INVOICING | PCI-DSS |
| `vet_payment_transactions` | master | IDEXX integrated POS (Worldpay), ezyVet Stripe/Square, Provet payments | VET-PRACT-MGMT-INVOICING | PCI-DSS |
| `boarding_reservations` | master | AVImark boarding, IDEXX Cornerstone boarding, Provet boarding | VET-PRACT-MGMT-BOARDING (optional module if boarding is in scope) | - |
| `vaccination_reminder_protocols` | config-master | IDEXX reminder protocols, ezyVet reminder rules, AVImark whisker tags | VET-PRACT-MGMT-PATIENT-CARE | AAHA/AVMA vaccine guidelines |
| `vet_species_breeds` | config-master | universal config table; weight-based dose calc keyed off species + breed | VET-PRACT-MGMT-PATIENT-CARE | - |
| `dea_reports` | derived/master | DEA Form 41 (wastage), Form 222 (Schedule II ordering), state PMP reporting | VET-PRACT-MGMT-INVENTORY-RX | DEA CSA, state PMP |
| `lab_test_orders` | master | IDEXX VetLab in-house orders, Antech reference-lab orders, IDEXX VetConnect Plus reference | VET-PRACT-MGMT-LAB-INTEGRATION | - |

**WRONG-OWNERSHIP** - none identified (zero modules means nothing is wrongly assigned yet; categorize at module authoring time).

**SCOPE-CREEP** - none identified in the 5 masters. The `supplier_invoices` contributor row is correctly VET-PRACT-MGMT-contributed from S2P.

**MODULARIZATION-ISSUE** - zero modules. The 6 capabilities map naturally to 4-5 modules. The recommendation is a 4-module split (with optional 5th for boarding if in scope):

| module candidate | masters (current + proposed) | covered capabilities |
| --- | --- | --- |
| VET-PRACT-MGMT-PATIENT-CARE | animal_patients, veterinary_vaccinations, veterinary_exam_notes, vaccination_reminder_protocols, vet_species_breeds | VET-PATIENT-CARE, VET-REMINDER-MGMT |
| VET-PRACT-MGMT-APPOINTMENTS | veterinary_appointments | VET-APPT-SCHED |
| VET-PRACT-MGMT-INVENTORY-RX | controlled_substance_ledger_entries, veterinary_prescriptions, vet_drug_inventory_items, dea_reports | VET-INVENTORY-RX |
| VET-PRACT-MGMT-LAB-INTEGRATION | veterinary_lab_results, lab_test_orders | VET-LAB-INTEGRATION |
| VET-PRACT-MGMT-INVOICING | pet_owners (embedded_master from PATIENT-CARE? or master here for client billing), vet_invoices, vet_payment_transactions | VET-INVOICING |

Open question: `pet_owners` is a master that anchors both clinical (PATIENT-CARE) and billing (INVOICING) flows. Could be PATIENT-CARE's master with INVOICING embedding, or canonical to INVOICING. Bucket 2 architectural decision.

### Pass 3 - Neighbor discovery

Edge weights derived from outbound `handoffs` (B9 table) and the `supplier_invoices` contributor row:

| neighbor | edge weight | outbound events | inbound | dependencies | notes |
| --- | --- | --- | --- | --- | --- |
| CSM | 2 | `animal_patient.appointment_due`, `veterinary_vaccination.due` | 0 | - | reminder outreach + case opens |
| GRC | 2 | `controlled_substance.dispensed`, `veterinary_lab_result.critical` | 0 | - | DEA reporting + reportable-disease logs |
| SUP-LIFE | 1 | `controlled_substance.dispensed` | 0 | - | drug-supplier reorder loop |
| ERP-FIN | 1 | `pet_owner.registered` | 0 | - | AR profile creation |
| S2P | 1 | - | (implied) | `supplier_invoices` contributor | drug-supplier invoice approval |

No neighbor reaches edge weight >=3. Per the audit recipe, each neighbor gets a one-line summary instead of the full 5-section diff. Note: CSM is the only neighbor with modules loaded (3); the other four are M1-failing partner domains.

### Pass 4 - Pairwise reconciliation per neighbor

#### CSM (edge weight 2) - one-line summary

Two outbound handoffs (337 `animal_patient.appointment_due`, 947 `veterinary_vaccination.due`), both with NULL source + target module FKs. CSM has 3 modules (CSM-CASE-MGMT, CSM-ENTITLEMENTS, CSM-KNOWLEDGE); the natural target module on both rows is CSM-CASE-MGMT (case-opens follow the reminder outreach). Existing relationship rows (`animal_patients opens customer_cases`, `veterinary_vaccinations opens customer_cases`) mirror these handoffs correctly. Source-side B10b fix owed by VET-PRACT-MGMT (Bucket 1 once modules exist); target-side B10b fix owed by CSM (since CSM has modules, this is actionable today, but it's CSM's audit to schedule).

#### GRC (edge weight 2) - one-line summary

Two outbound handoffs (335 `controlled_substance.dispensed` -> GRC, 948 `veterinary_lab_result.critical` -> GRC), both with NULL source + target module FKs. GRC has 0 modules per spot-check; target-side fix waits on GRC modularization. No mirror `data_object_relationships` rows exist for either; Bucket 1 source-side B8 fix needed (e.g. `controlled_substance_ledger_entries reports_to <grc-payload>`, `veterinary_lab_results triggers <grc-adverse-event>`).

#### SUP-LIFE (edge weight 1) - one-line summary

One outbound (336 `controlled_substance.dispensed` -> SUP-LIFE) for reorder loop. NULL source + target module FKs. SUP-LIFE has 0 modules; target-side fix waits. Plus inbound dependency via S2P-mastered `supplier_invoices` row (id=75, contributor + required) but no inbound handoff loaded. Report-only (SUP-LIFE B9 owes outbound on drug-supplier reorder confirmation; S2P B9 owes outbound on `supplier_invoices.approved` to VET-PRACT-MGMT).

#### ERP-FIN (edge weight 1) - one-line summary

One outbound (946 `pet_owner.registered` -> ERP-FIN) creating AR profile. NULL module FKs both sides. ERP-FIN has 0 modules; target-side fix waits. No mirror relationship row for `pet_owners -> erp-fin-payload` (likely `customers` or `ar_accounts`). Bucket 1 source-side B8 + B10b.

#### S2P (dependency-only, edge weight 1) - report-only

`supplier_invoices` (id=75) is mastered in S2P (id=27); VET-PRACT-MGMT consumes as contributor (drug-supplier invoice routing). No inbound handoff today. Report-only follow-up: S2P B9 owes outbound on `supplier_invoices.received` / `.approved` to VET-PRACT-MGMT once both are modularized.

### Bucket 1 - In-scope confirmed gaps

**Bucket 1 sub-categorization** (14 line items by finding type):

| finding type | count |
| --- | --- |
| MISSING (entity gap, in scope at module-authoring time) | 0 (deferred to Bucket 3 per audit recipe) |
| STRUCTURAL | 9 |
| BOUNDARY | 4 |
| APQC TAGGING | 1 (covers 4 proposed rows + 2 deferred) |

#### STRUCTURAL findings

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows | Author the 4-module set (VET-PRACT-MGMT-PATIENT-CARE, VET-PRACT-MGMT-APPOINTMENTS, VET-PRACT-MGMT-INVENTORY-RX, VET-PRACT-MGMT-LAB-INTEGRATION, VET-PRACT-MGMT-INVOICING) per Pass-2 modularization. Bucket 2.1 confirms shape and BOARDING-optionality first. |
| B1-S2 | A4 | `catalog_tagline` and `catalog_description` empty | Draft both in buyer voice per Rule #20; surface to user for approval (Bucket 2.2). |
| B1-S3 | B6 | Zero intra-domain `data_object_relationships` | Draft ~5 edges: `pet_owners owns animal_patients`, `animal_patients receives veterinary_vaccinations`, `animal_patients undergoes veterinary_lab_results`, `animal_patients administered controlled_substance_ledger_entries`, `veterinary_vaccinations drew_from controlled_substance_ledger_entries` (only for controlled anesthetic doses). Load via cluster-drafts pattern. |
| B1-S4 | B7 | Zero `users` edges | Draft ~5 edges: `animal_patients.primary_veterinarian -> users`, `veterinary_vaccinations.administered_by -> users`, `veterinary_lab_results.ordered_by -> users`, `controlled_substance_ledger_entries.dispensed_by -> users` (DEA-attributed), `pet_owners.account_owner -> users` (client-services rep). |
| B1-S5 | B9 (events with empty category) | 4 of 6 `trigger_events` have `event_category=''` | PATCH event_category: `pet_owner.registered` -> `lifecycle`; `veterinary_vaccination.administered` -> `lifecycle`; `veterinary_vaccination.due` -> `threshold`; `veterinary_lab_result.critical` -> `signal`. |
| B1-S6 | B9 (missing handoff) | `veterinary_vaccination.administered` (id=1088) has zero `handoffs` rows | Author handoff(s): -> CSM (next-dose reminder scheduling, mirrors existing `veterinary_vaccination.due` -> CSM pattern), -> GRC (rabies-tag reporting, where state law requires submission). Two handoff rows on the same event id. |
| B1-S7 | B11 | Zero aliases on any master | Draft ~8 alias rows: `pet_owners` <-> "Client" (vendor terminology, near-universal across PIMS), "Owner"; `animal_patients` <-> "Patient", "Pet Patient"; `veterinary_vaccinations` <-> "Vaccine Record", "Immunization"; `veterinary_lab_results` <-> "Lab Test", "Diagnostics Result"; `controlled_substance_ledger_entries` <-> "DEA Log Entry", "Schedule Drug Log". |
| B1-S8 | B12 | Zero `data_object_lifecycle_states` across all 5 masters | Author state machines per masters list in B12 above. `vaccination_reminder_protocols` and `vet_species_breeds` (Phase 0 / Bucket 3) are config-shaped; surface to Bucket 2 whether the workflow-bearing masters carry separate config-shape exemption rationale per Rule #12 / Rule #15. |
| B1-S9 | F1 + F3 | Legacy `vet-pract-mgmt-system` skill (id=116, `domain_module_id=null`) + thin tool set (5 `query` + 1 `send_email`, no `mutate` / `fetch` / `inbound`) | Retire legacy skill (DELETE) once module-level skills are authored under Phase S. Per-module tool set extensions: `mutate_animal_patient_status`, `mutate_controlled_substance_ledger_dispense` (DEA-attributed), `mutate_veterinary_lab_result_review`, `fetch_idexx_vetconnect_lab_result`, `fetch_antech_lab_result`, `inbound_receive_lab_result_webhook`, `inbound_receive_payment_settlement_webhook`. |

#### BOUNDARY findings (per neighbor)

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-B1 | B10b (outbound) | All 6 outbound handoffs have `source_domain_module_id=NULL` | Backfill once VET-PRACT-MGMT modules exist: route each event to its master's module (pet_owner.registered -> VET-PRACT-MGMT-PATIENT-CARE or INVOICING per the Bucket 2 module split; controlled_substance.* -> VET-PRACT-MGMT-INVENTORY-RX; animal_patient.appointment_due -> VET-PRACT-MGMT-APPOINTMENTS; vaccination.* -> VET-PRACT-MGMT-PATIENT-CARE; lab_result.* -> VET-PRACT-MGMT-LAB-INTEGRATION). |
| B1-B2 | B8 (GRC mirrors) | No outbound `data_object_relationships` mirrors for `controlled_substance_ledger_entries -> GRC` payload (DEA reporting) and `veterinary_lab_results -> GRC` payload (adverse-event reporting for reportable diseases) | Author cross-domain relationship rows once GRC's payload masters are known (likely `compliance_obligations` or `adverse_events`). |
| B1-B3 | B8 (SUP-LIFE mirror) | No outbound `data_object_relationships` for `controlled_substance_ledger_entries -> SUP-LIFE` reorder payload | Author edge once SUP-LIFE's `supplier_orders` / `replenishment_orders` master is identified. |
| B1-B4 | B8 (ERP-FIN mirror) + F7 (channel-vs-capability) | (B8) No outbound `data_object_relationships` for `pet_owners -> ERP-FIN` payload (likely `customers` or `ar_accounts`). PLUS (F7) the legacy skill's `send_email` link is generic notification flavor (vaccination-due, appointment-due, lab-result-critical reminders are substitutable-channel); when modules are authored and the legacy skill retired, the per-module reminder workflow should link `notify_person` not `send_email` per the channel-vs-capability authoring rule. | Add the relationship row + when authoring Phase-S tools for the PATIENT-CARE / APPOINTMENTS modules, link `notify_person` (not `send_email`) for generic reminder outreach. |

#### APQC TAGGING

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-H1 | H1 | Zero `handoff_processes` rows across 6 outbound handoffs | Author 4 `agent_curated` rows + 2 deferred per table below. |

**B1-H1 proposed tags** (`proposal_source='agent_curated'`, `record_status='new'`):

| handoff_id | source -> target | trigger_event | payload | proposed PCF row | PCF id | external_id | confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 335 | VET-PRACT-MGMT -> GRC | `controlled_substance.dispensed` | `controlled_substance_ledger_entries` | Report incidents and risks to regulatory bodies | 199 | 12840 | confident L3 |
| 337 | VET-PRACT-MGMT -> CSM | `animal_patient.appointment_due` | `animal_patients` | Manage notification outcome | 734 | 11793 | confident L4 |
| 947 | VET-PRACT-MGMT -> CSM | `veterinary_vaccination.due` | `veterinary_vaccinations` | Manage notification outcome | 734 | 11793 | confident L4 |
| 948 | VET-PRACT-MGMT -> GRC | `veterinary_lab_result.critical` | `veterinary_lab_results` | Report incidents and risks to regulatory bodies | 199 | 12840 | confident L3 (reportable-disease / adverse-event reporting) |

**Deferred to Discover Pass 3** (no clean cross-industry PCF match):

| handoff_id | source -> target | trigger_event | payload | deferral reason |
| --- | --- | --- | --- | --- |
| 336 | VET-PRACT-MGMT -> SUP-LIFE | `controlled_substance.dispensed` | `controlled_substance_ledger_entries` | Reorder/replenishment trigger from a clinical-dispense event has no clean APQC L3/L4 in cross-industry PCF (closest: "Manage raw material inventory" id=826 L4 but the noun doesn't fit veterinary controlled-substance reorder; "Process accounts payable" is too far). Defer to custom process authoring (industry-specific veterinary-supply reorder workflow). |
| 946 | VET-PRACT-MGMT -> ERP-FIN | `pet_owner.registered` | `pet_owners` | New-client AR profile creation. "Process accounts receivable (AR)" (id=303, L3) is the closest parent but the trigger is *registration*, not invoicing-or-collection. "Collect and maintain account information" (id=736, L4) fits the substrate but mis-frames the trigger. Defer to custom process authoring. |

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module shape confirmation.** The Pass-2 4-module split (PATIENT-CARE + APPOINTMENTS + INVENTORY-RX + LAB-INTEGRATION + INVOICING) is the proposed default; alternative is 4 modules collapsing APPOINTMENTS into PATIENT-CARE (appointment scheduling is tightly coupled to patient records in IDEXX Cornerstone / ezyVet; the split could over-modularize a 600M USD market). Sub-decision: should BOARDING be a 6th module, a starter kit, or out of scope? Decision shape: name the module set before B1-S1 can proceed. Options: (a) 5-module split as proposed; (b) 4-module split merging APPOINTMENTS into PATIENT-CARE; (c) 6-module split adding BOARDING.
2. **`catalog_tagline` and `catalog_description` wording (A4 + Rule #20).** Per Rule #15 / Rule #20, the agent does NOT auto-draft these; the user authors or approves a buyer-voice tagline + 1-3 paragraph description. Agent can propose drafts but cannot write without approval. Independent.
3. **`pet_owners` pattern flag (B4).** Pet owners are human PII (name, address, payment instrument, ZIP, sometimes SSN-derived credit-check data) which suggests `has_personal_content=true`. The strict reading of the flag is whether the record carries personal content meaningful for GDPR / CCPA scope; veterinary clinics ARE subject to state consumer-privacy laws even if not HIPAA. Decision: PATCH `has_personal_content=true` on `pet_owners`?
4. **`controlled_substance_ledger_entries` pattern flag (B4).** DEA Schedule II-V dispense records are append-only by federal law (DEA 21 CFR 1304); corrections require a strikethrough + initialed entry, not edit-in-place. Strong candidate for `has_submit_lock=true`. Decision: PATCH the flag?
5. **`feed_rations`-style config-shape exemption check (B12).** Whether any of the 5 current masters qualifies for the config-shape exemption (no workflow, author-once). Recommendation: all 5 carry observable state machines (drafted in B12); none qualify. Decision: confirm all 5 get state machines loaded.
6. **Capability business-function overrides (C2).** Plausible overrides per the C2 finding: `VET-INVOICING` -> Accounts Receivable, `VET-INVENTORY-RX` -> Compliance Operations, `VET-REMINDER-MGMT` -> Customer Service. Decision shape: load three override `business_function_capabilities` rows, or accept the domain-level RACI as canonical for capabilities. Independent.

### Bucket 3 - Phase 0 pending (speculative)

Vendor-knowledge-based candidates from Pass 2 MISSING entities, not yet anchored to a formal Phase 0 vendor surface document. Each candidate names the flagship source.

1. **`veterinary_appointments`** (IDEXX Cornerstone appointment book, ezyVet calendar, AVImark scheduler, Vetspire Calendar). Vendor-universal; effectively required for the APPT-SCHED capability to land in any module. Phase 0 verification: confirm appointment as first-class entity vs. derived from exam_notes. Recommended cluster: VET-PRACT-MGMT-APPOINTMENTS (or PATIENT-CARE if module split merges).
2. **`veterinary_exam_notes` + `vaccination_reminder_protocols`** (IDEXX SOAP, ezyVet clinical-records, AAHA/AVMA reminder rules). Phase 0: SOAP-note model varies vendor-by-vendor (Subjective/Objective/Assessment/Plan structured fields vs. unstructured rich text). Recommended cluster: VET-PRACT-MGMT-PATIENT-CARE.
3. **`veterinary_prescriptions` + `vet_drug_inventory_items` + `dea_reports`** (IDEXX Inventory Pro, Cubex narcotic cabinets, DEA Form 41 / 222). Phase 0: confirm prescription as separate master from ledger-entry; DEA reports are aggregations (derived?) vs. submitted-documents (master with workflow). Recommended cluster: VET-PRACT-MGMT-INVENTORY-RX.
4. **`vet_invoices` + `vet_payment_transactions`** (IDEXX integrated POS, ezyVet Stripe/Square, Provet payments). Phase 0: invoice/payment is universal but the entity could partly belong to ERP-FIN; veterinary POS is in-clinic and PCI-DSS-bounded. Recommended cluster: VET-PRACT-MGMT-INVOICING.
5. **`boarding_reservations`** (AVImark boarding, Cornerstone boarding, Provet boarding module). Phase 0: boarding is an optional capability NOT in the current 6-capability list; many clinics outsource boarding. Decision is whether to add the capability + module at all. Recommended cluster: VET-PRACT-MGMT-BOARDING (optional module).
6. **`lab_test_orders` + `vet_species_breeds`** (IDEXX VetLab / VetConnect Plus, Antech Lab, AAHA species/breed config). Phase 0: lab-test-orders are typically distinct from lab_results (orders go out, results come back asynchronously, often days later). vet_species_breeds is a config table that drives weight-based dose calc + breed-specific reminder protocols. Recommended cluster: VET-PRACT-MGMT-LAB-INTEGRATION (for orders) + VET-PRACT-MGMT-PATIENT-CARE (for species/breeds).

### Cross-bucket dependencies

- Bucket 2 item 1 (module shape) gates every Bucket 1 STRUCTURAL fix that references modules (B1-S1, B1-S5 source-module backfill semantics, B1-B1, F2, F3, E-band). User resolves Bucket 2.1 first; Bucket 1 fixes follow.
- Bucket 3 items 1-6 (MISSING entities) inform Bucket 2 item 1 (module shape): adopting a 5- or 6-module split changes which masters anchor which modules, which changes how the existing 5 masters cluster. Recommendation: resolve Bucket 2.1 first with the existing 5 masters; let Bucket 3 vetting drive subsequent Phase A loads.
- Bucket 2 item 3 (pet_owners personal-content flag) and item 4 (controlled_substance_ledger_entries submit-lock flag) are independent PATCHes; can proceed regardless of module shape.
- Bucket 2 item 5 (config-shape exemption check) becomes more relevant if Bucket 3.2 (vaccination_reminder_protocols, vet_species_breeds) loads, as those are the candidate config-shape masters.
- Bucket 2 item 6 (capability business-function overrides) is independent.

### Per-bucket prompts

**Bucket 1:** "Fix these 14 items? Bucket 1 is gated on Bucket 2 item 1 (module shape). Reply 'after Bucket 2.1', 'approve all the non-gated items now' (B1-S2 / A4 wording will still need your approval per Rule #20; B1-S5 trigger-event PATCH, B1-S7 aliases, B1-H1 APQC tagging are non-gated), or 'just B1-S5 + B1-S7' (event-category PATCH + aliases)."

**Bucket 2:** "Decisions needed on 6 items. Item 1 (module shape: 4-vs-5-vs-6 modules; boarding scope) is the structural gate; please answer first. Items 2 (catalog_tagline / description wording per Rule #20), 3 (pet_owners personal-content flag), 4 (controlled_substance_ledger_entries submit-lock flag), 5 (confirm all 5 masters carry workflow lifecycle states, none config-shape), 6 (capability business-function overrides for INVOICING / INVENTORY-RX / REMINDER-MGMT) can be resolved in any order. Reply per item."

**Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which of the 6 candidate groups ring true (veterinary_appointments, veterinary_exam_notes + reminder_protocols, prescriptions + inventory + dea_reports, vet_invoices + payments, boarding_reservations, lab_test_orders + vet_species_breeds) and they'll move to Bucket 1 in the next pass."

### Report-only follow-ups (owed by other domains)

- **CSM B10b owes target-side module FK** on handoffs 337 (`animal_patient.appointment_due`) and 947 (`veterinary_vaccination.due`). CSM has 3 modules; the natural target is CSM-CASE-MGMT. Actionable today on CSM's audit.
- **CSM B8** owes inbound `data_object_relationships` rows mirroring the two reminder-driven handoffs (e.g. `customer_cases responds_to animal_patient_reminder`). Existing rows from this domain's side (`animal_patients opens customer_cases`, `veterinary_vaccinations opens customer_cases`) are the outbound mirrors; the inbound side, if CSM wants it, owes a `customer_cases triggered_by <event>` row.
- **GRC B10b owes target-side module FK** on handoffs 335 (`controlled_substance.dispensed`) and 948 (`veterinary_lab_result.critical`). GRC has 0 modules per spot-check; fix lands when GRC is modularized.
- **GRC B8** owes inbound `data_object_relationships` for the two reporting payloads (DEA dispense reports, reportable-disease lab-result events).
- **SUP-LIFE B10b owes target-side module FK** on handoff 336 (`controlled_substance.dispensed` reorder). SUP-LIFE has 0 modules per spot-check.
- **SUP-LIFE B9** owes outbound on drug-supplier-reorder confirmation / supplier lifecycle changes affecting clinic drug inventory (back to VET-PRACT-MGMT once VET-PRACT-MGMT is modularized).
- **S2P B9** owes outbound on `supplier_invoices.approved` / `.paid` / `.received` to VET-PRACT-MGMT (this domain's contributor + required dependency on id=75).
- **ERP-FIN B10b owes target-side module FK** on handoff 946 (`pet_owner.registered`). ERP-FIN has 0 modules per spot-check.
- **ERP-FIN B8** owes inbound `data_object_relationships` for the AR-profile-create payload (likely `customers` or `ar_accounts`).
- **Partner-domain module sparsity (informational):** spot-checks of GRC, SUP-LIFE, S2P, ERP-FIN returned zero `domain_modules` for each. M-band hard fail on all four partners; auditing them would be a high-leverage follow-up given VET-PRACT-MGMT depends on all four for outbound handoff target-module FKs. CSM is the only modularized neighbor.

## 2026-05-31, Continuation: B1 technical fixes

Applied only the truly-technical, audit-pre-specified slice of Bucket 1. Deferred all judgment-bearing items per task spec.

### Applied

- **B1-S5 (trigger_event enum backfill):** PATCHed `event_category` on 4 events: `pet_owner.registered` (id=1087) -> `lifecycle`; `veterinary_vaccination.administered` (id=1088) -> `lifecycle`; `veterinary_vaccination.due` (id=1089) -> `threshold`; `veterinary_lab_result.critical` (id=1090) -> `signal`. All 6 events on this domain's masters now carry a non-empty `event_category`.
- **B1-S3 (intra-domain `data_object_relationships`):** INSERTed 4 of the 5 audit-listed edges (record_status defaults to `new`):
  - id=1697: `pet_owners` (396) `owns` `animal_patients` (395), one_to_many, composition, source-owned, required.
  - id=1698: `animal_patients` (395) `receives` `veterinary_vaccinations` (397), one_to_many, composition, source-owned.
  - id=1699: `animal_patients` (395) `undergoes` `veterinary_lab_results` (398), one_to_many, composition, source-owned.
  - id=1700: `animal_patients` (395) `administered` `controlled_substance_ledger_entries` (399), one_to_many, reference, source-owned.
  - **Deferred:** `veterinary_vaccinations drew_from controlled_substance_ledger_entries` (conditional "only for controlled anesthetic doses" qualifier; not a deterministic structural edge for every vaccination row, so it is a judgment call).
- **B1-S4 (users edges, Rule #10):** INSERTed 5 user-actor edges, all targeting the platform built-in `users` (id=748), target-owned, reference, one_to_many: id=1701 `animal_patients.primary_veterinarian`; id=1702 `veterinary_vaccinations.administered_by`; id=1703 `veterinary_lab_results.ordered_by`; id=1704 `controlled_substance_ledger_entries.dispensed_by`; id=1705 `pet_owners.account_owner`.
- **B1-H1 (APQC tagging):** INSERTed 4 `handoff_processes` rows with `proposal_source='agent_curated'`, `role='implements'`, record_status defaulting to `new`. PCF external_id -> process_id resolution: 12840 -> 199 ("Report incidents and risks to regulatory bodies"); 11793 -> 734 ("Manage notification outcome"). Pairs: id=494 (handoff=335, process=199); id=495 (handoff=337, process=734); id=496 (handoff=947, process=734); id=497 (handoff=948, process=199). 2 handoffs (336 SUP-LIFE reorder, 946 ERP-FIN AR-profile-create) remain deferred to Discover Pass 3 per the original audit.

### Deferred

- **B1-S1 (module authoring):** new modules deferred (judgment, gated on Bucket 2.1).
- **B1-S2 (catalog_tagline / catalog_description):** Rule #20 user-approval required.
- **B1-S6 (new handoff INSERTs for `veterinary_vaccination.administered`):** audit names targets (CSM, GRC) but doesn't pre-specify `integration_pattern`, `friction_level`, or target_domain_module_id; not a deterministic technical insert.
- **B1-S7 (aliases bulk):** deferred. Audit text says "Draft ~8 alias rows" rather than pre-specifying exact tuples to insert; Rule #9 collision arbitration warrants user sign-off on at least the "Client" canonical-claim posture.
- **B1-S8 (lifecycle states for 5 masters):** deferred. Bucket 2 item 5 still wants explicit user confirmation that no master qualifies for the config-shape exemption (Rule #12), and the state-machine drafts in B12 are draft-shaped not insert-shaped.
- **B1-S9 (retire legacy skill + new tools):** gated on module authoring (B1-S1).
- **B1-B1 (source_domain_module_id backfill on 6 outbound handoffs):** gated on B1-S1 (no VET-PRACT-MGMT modules exist yet).
- **B1-B2 / B1-B3 / B1-B4 (cross-domain `data_object_relationships` mirrors to GRC / SUP-LIFE / ERP-FIN payloads):** gated on partner-domain module + master authoring (each has 0 modules per the original audit's neighbor pass).

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_vet_pract_mgmt_b1_technical_2026_05_31.ts`. Invoked from project root via `bun run "<absolute path>"`. Idempotent: each section reads live state before writing and skips rows that already exist. No JWT errors. No `notes` writes. record_status omitted on all inserts (defaults to `new`).

## 2026-05-31, Audit

Validate b1 structural pass (re-run after the morning Continuation load). Scope: A, M, B (B5/B7/B9/B9b/B10b/B11/B12), C, D, E, F (F1-F5), H. Live PostgREST only; no MCP. No JWT-audience errors.

### Summary

- Current footprint: domain id=151, 0 `domain_modules`, 5 masters (animal_patients 395, pet_owners 396, veterinary_vaccinations 397, veterinary_lab_results 398, controlled_substance_ledger_entries 399), 1 contributor (supplier_invoices 75, mastered by S2P), 6 capabilities (VET-PATIENT-CARE, VET-APPT-SCHED, VET-INVOICING, VET-INVENTORY-RX, VET-LAB-INTEGRATION, VET-REMINDER-MGMT), 9 primary solutions (IDEXX Cornerstone, ezyVet, AVImark, ImproMed, Vetspire, Provet Cloud, NaVetor, Hippo Manager, Shepherd), 4 `business_function_domains` (owner Business Operations, contributors Customer Service + Accounts Receivable, consumer Compliance Operations), 4 regulations (DEA CSA, State Veterinary Practice Acts, PCI-DSS, SOC 2), 6 outbound + 0 inbound handoffs, 6 trigger events (all carry non-empty `event_category` after the 2026-05-31 Continuation PATCH), 9 `data_object_relationships` (4 intra-domain edges + 5 `users` edges from the Continuation load, plus 2 prior outbound to CSM `customer_cases` id=103), 0 lifecycle states, 0 aliases, 1 legacy domain-level `skills` row (id=116, `domain_module_id=null`) with 6 `skill_tools` (5 `query` + 1 `side_effect send_email`), 5 of 6 handoffs APQC-tagged.
- Bucket 1 (in-scope, agent fixable, post-Continuation): 11 items still PENDING.
- Bucket 2 (surface-for-user, judgment): 6 items still PENDING.
- Bucket 3 (Phase 0 pending, speculative): 6 items still PENDING.
- Cross-domain handoff count (N): 6 outbound + 0 inbound. APQC coverage now: 5 tagged (`agent_curated`, `record_status='new'`), 1 untagged (handoff 946 ERP-FIN `pet_owner.registered`). Catalog-quality headline: 0 of 6 `approved` (0%). Process-health side-bar: 5 `agent_curated`.
- Structural gate state: M1 HARD FAIL persists (zero `domain_modules`). Every downstream module-touching fix is still gated behind module authoring (Bucket 2 item 1).

### Pass 1 - Structural (per-domain completeness checklist)

#### S-band coverage sweep

**S1. FK-to-`domains` coverage (id=151).**

| Table | FK column | rows | Expected non-zero? |
| --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 6 (5 master + 1 contributor) | Yes (B1) - pass |
| `solution_domains` | `domain_id` | 9 (all `primary`) | Yes (A3) - pass |
| `business_function_domains` | `domain_id` | 4 (owner + 2 contributors + 1 consumer) | Yes (C1) - pass |
| `capability_domains` | `domain_id` | 6 | Yes (A2) - pass |
| `domain_regulations` | `domain_id` | 4 | Yes - pass |
| `handoffs.source_domain_id` | `source_domain_id` | 6 | Yes (B9) - pass |
| `handoffs.target_domain_id` | `target_domain_id` | 0 | Usually yes - anomaly (no inbound captured; routes to B10 report-only) |
| `skills.domain_id` | `domain_id` | 1 (legacy, `domain_module_id=null`) | F2: exactly one per module - **FAIL** (no modules; legacy row only) |
| `domain_modules.domain_id` | `domain_id` | 0 | Yes (M1) - **HARD FAIL** |
| `domain_module_host_domains.domain_id` | `domain_id` | 0 | Routinely zero - pass |

**S2.** Vacuous (no modules).

**S3. Per-master indirect-table coverage.**

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `animal_patients` (395) | 0 | 1 (`animal_patient.appointment_due`) | 0 |
| `pet_owners` (396) | 0 | 1 (`pet_owner.registered`) | 0 |
| `veterinary_vaccinations` (397) | 0 | 2 (`.administered`, `.due`) | 0 |
| `veterinary_lab_results` (398) | 0 | 1 (`.critical`) | 0 |
| `controlled_substance_ledger_entries` (399) | 0 | 1 (`.dispensed`) | 0 |

Every master remains at 0 states + 0 aliases. Routes to B12 (lifecycle) + B11 (aliases) for this audit.

#### A-band - Market shape

- **A1.** PASS. `crud_percentage=85`, `business_logic` non-empty, `min_org_size='10 xs <50'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=600`, `market_size_source_year=2024`.
- **A2.** PASS. 6 capabilities linked (>=3 floor).
- **A3.** PASS. 9 solutions, all `primary` (worth flagging in Bucket 2 once a refresh cycle runs; not a structural fail).
- **A4.** FAIL. `catalog_tagline=''`, `catalog_description=''`. Bucket 2.2 (Rule #20 requires user-approved buyer-voice wording before write).
- **A5.** Skipped (not requested).

#### M-band - STRUCTURAL GATE

- **M1.** Zero `domain_modules` rows. HARD FAIL. Gates everything else.
- **M2 - M8.** All vacuous until M1 is cured.

#### B-band

- **B1.** 5 master rows. PASS.
- **B2.** All masters have `singular_label` and `plural_label`. PASS (per prior audit; flags unchanged).
- **B3.** All names prefixed, none bare-word. PASS.
- **B4.** All 5 masters carry `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Positive re-evaluation unchanged from prior audit: `pet_owners` warrants `has_personal_content=true` (PII); `controlled_substance_ledger_entries` warrants `has_submit_lock=true` (DEA 21 CFR 1304 append-only ledger). Both remain Bucket 2.3 / 2.4.
- **B5.** Zero `embedded_master` rows. PASS vacuously. Rule #11 cannot fail.
- **B6.** 4 intra-domain `data_object_relationships` now loaded (ids 1697-1700). Coverage: `pet_owners owns animal_patients`, `animal_patients receives veterinary_vaccinations`, `animal_patients undergoes veterinary_lab_results`, `animal_patients administered controlled_substance_ledger_entries`. Missing (Continuation deferral): `veterinary_vaccinations drew_from controlled_substance_ledger_entries` (conditional on controlled-anesthetic doses, judgment call). PASS structurally for the 4 deterministic edges; the conditional edge is a Bucket 2 follow-up.
- **B7.** 5 `users` edges loaded (ids 1701-1705) covering primary_veterinarian, administered_by, ordered_by, dispensed_by, account_owner. PASS.
- **B8.** Outbound cross-domain edges: 2 rows (ids 474, 475) `animal_patients opens customer_cases` (id 103), `veterinary_vaccinations opens customer_cases`. Missing mirrors for the 4 non-CSM outbound handoffs (controlled_substance_ledger_entries -> GRC, -> SUP-LIFE; veterinary_lab_results -> GRC; pet_owners -> ERP-FIN). FAIL. Each is gated on the partner-domain master being identified (Bucket 1, partner-master-prerequisite).
- **B9.** 6 outbound events (id 329, 330, 1087, 1088, 1089, 1090), all `event_category` non-empty. 6 handoff rows cover events 329, 330, 1087, 1089, 1090. Event 1088 `veterinary_vaccination.administered` still has zero `handoffs` rows. FAIL on event 1088. Bucket 1 STRUCTURAL.

  Outbound handoff table (post-Continuation):

  | handoff_id | event_name | data_object | target_domain | pattern | friction | source_module_FK | target_module_FK |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 335 | `controlled_substance.dispensed` | 399 | GRC (15) | batch_sync | medium | NULL | NULL |
  | 336 | `controlled_substance.dispensed` | 399 | SUP-LIFE (28) | api_call | low | NULL | NULL |
  | 337 | `animal_patient.appointment_due` | 395 | CSM (30) | api_call | low | NULL | NULL (CSM has 3 modules) |
  | 946 | `pet_owner.registered` | 396 | ERP-FIN (65) | event_stream | low | NULL | NULL |
  | 947 | `veterinary_vaccination.due` | 397 | CSM (30) | api_call | medium | NULL | NULL (CSM has 3 modules) |
  | 948 | `veterinary_lab_result.critical` | 398 | GRC (15) | event_stream | medium | NULL | NULL |

- **B9b.** Skipped (no modules; <2 module floor). Routes to M1.
- **B10.** Inbound report-only. Zero rows. Owed-by candidates unchanged:
  - S2P B9 owes outbound on `supplier_invoices.*` (this domain's contributor + required on id 75).
  - Lab-system inbound (IDEXX VetConnect, Antech) not catalog-domains today; integration-layer not first-class.
- **B10b.** All 6 outbound handoffs still carry `source_domain_module_id=NULL` (gated on M1) and `target_domain_module_id=NULL`. Per-target resolvability:
  - 337, 947 -> CSM: target-side deterministically resolvable to CSM-CASE-MGMT (id 112). REPORT-ONLY follow-up for CSM B10b on its own audit.
  - 335, 948 -> GRC: target has 0 modules. Waits on GRC M1.
  - 336 -> SUP-LIFE: target has 0 modules. Waits on SUP-LIFE M1.
  - 946 -> ERP-FIN: target has 0 modules. Waits on ERP-FIN M1.
  Source-side fix (all 6 rows) is owed by VET-PRACT-MGMT once M1 is cured. Bucket 1 (source-side, gated on M1).
- **B11.** Zero aliases on any master. Expected synonyms unchanged from prior audit: most load-bearing is `pet_owners` <-> "Client" (universal PIMS term across IDEXX / ezyVet / AVImark). FAIL. Bucket 1 STRUCTURAL.
- **B12.** Zero `data_object_lifecycle_states` across all 5 masters. FAIL. Bucket 1 STRUCTURAL. Bucket 2.5 still wants explicit user confirmation that none qualify for the Rule #12 config-shape exemption.

#### C-band

- **C1.** PASS. 4 `business_function_domains` rows (owner Business Operations, contributors Customer Service + Accounts Receivable, consumer Compliance Operations).
- **C2.** Zero `business_function_capabilities` overrides. Plausible overrides unchanged (VET-INVOICING -> AR, VET-INVENTORY-RX -> Compliance Ops, VET-REMINDER-MGMT -> Customer Service). Bucket 2.6.

#### D-band

- **D1.** Not run. UI links remain `https://tests.semantius.app/domain_map/<table>`.

#### E-band

- **E1 - E5.** All vacuous (gated on M1; no modules -> no roles authorable since the 2-module floor would block).

#### F-band

- **F1.** 1 legacy `skills` row (id=116, `domain_module_id=null`). Acceptable transitional only because no module-level skills exist yet. Bucket 1 (gated on M1; retire only after module-level skills replace it).
- **F2.** Zero module-level system skills. FAIL gated on M1.
- **F3.** Legacy skill has 6 `skill_tools` rows (5 `query`, all `coverage_tier=platform`, one per master; 1 `side_effect send_email`, `coverage_tier=platform`). Thin: zero `mutate`, zero workflow gates, zero `fetch` (IDEXX VetConnect Plus, Antech), zero `inbound` (lab-result webhook, payment-settlement webhook). Bucket 1 STRUCTURAL (gated on M1 for per-module redistribution).
- **F4.** All 6 tool rows pair `operation_kind` and `data_object_id` correctly. PASS.
- **F5.** Score uncomputable (no modules). Routes to F2 + F3.
- **F7.** Legacy skill links `send_email` directly. Per the channel-vs-capability authoring rule, reminder workflows (vaccination-due, appointment-due, lab-critical) are substitutable-channel and should link `notify_person` after the legacy skill is retired. Bucket 1 (gated on M1).

#### H-band

- **H1.** 5 of 6 handoffs now carry an `agent_curated` `handoff_processes` row (record_status='new'):
  - 335 (CONTROLLED_SUBSTANCE -> GRC) -> process 199 "Report incidents and risks to regulatory bodies" (PCF L3, external_id 12840).
  - 336 (CONTROLLED_SUBSTANCE -> SUP-LIFE) -> process 815 "Monitor/Manage supplier information" (PCF L4, external_id 10299). Note: this row exists in the live catalog but was DEFERRED in the prior audit narrative; current state shows it tagged.
  - 337 (APPOINTMENT_DUE -> CSM) -> process 734 "Manage notification outcome" (PCF L4, external_id 11793).
  - 947 (VACCINATION_DUE -> CSM) -> process 734 "Manage notification outcome".
  - 948 (LAB_CRITICAL -> GRC) -> process 199 "Report incidents and risks to regulatory bodies".
  - Untagged: 946 (PET_OWNER_REGISTERED -> ERP-FIN). Closest PCF activities: 303 "Process accounts receivable (AR)" (L3, but mis-frames the trigger which is registration, not invoicing); 736 "Collect and maintain account information" (L4, fits the substrate). Bucket 1 APQC TAGGING for the single remaining row; classify-or-defer call.
  - Catalog-quality headline: 0 of 6 `approved` (0%). Process-health: 5 of 6 `agent_curated`.

### Pass 2 - Market audit (semantic)

No re-spawn of a market-surface subagent this run; the prior audit's MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / MODULARIZATION conclusions stand (all 5 current masters cluster cleanly across the proposed 5-module split; 11 candidate MISSING entities remain Bucket 3). Re-running the subagent on the same 24-hour window would not produce new vendor-surface evidence; revisit on the next audit (>=1 week interval) or when Bucket 2.1 module decision shifts.

### Pass 3 - Neighbor discovery

Edge weights unchanged (no new handoffs since the prior audit). CSM (weight 2), GRC (weight 2), SUP-LIFE (weight 1), ERP-FIN (weight 1), S2P (dep-only weight 1). No neighbor reaches >=3 -> one-line-per-neighbor in Pass 4.

### Pass 4 - Pairwise reconciliation per neighbor

- **CSM (weight 2).** 2 outbound (337, 947) with NULL source + target module FKs. CSM has 3 modules; deterministic target -> CSM-CASE-MGMT (id 112). 2 existing relationship rows (474, 475) on `customer_cases` mirror the handoffs correctly. Source-side B10b owed by VET-PRACT-MGMT (gated on M1). Target-side B10b owed by CSM B10b (actionable today on CSM's audit).
- **GRC (weight 2).** 2 outbound (335, 948) with NULL FKs. GRC has 0 modules; target-side waits on GRC M1. No `data_object_relationships` mirrors for either payload (DEA dispense report, adverse-event report). Bucket 1 B8 mirror is blocked on GRC mastering the payload.
- **SUP-LIFE (weight 1).** 1 outbound (336) reorder loop, NULL FKs. SUP-LIFE has 0 modules; waits on SUP-LIFE M1. No `data_object_relationships` mirror.
- **ERP-FIN (weight 1).** 1 outbound (946) AR-profile-create, NULL FKs. ERP-FIN has 0 modules; waits on ERP-FIN M1. No `data_object_relationships` mirror for `pet_owners -> erp-fin-payload`.
- **S2P (dep-only, weight 1).** `supplier_invoices` (id 75) consumed as contributor + required. No inbound handoff loaded. Report-only: S2P B9 owes outbound on `supplier_invoices.received` / `.approved`.

### Bucket 1 - In-scope confirmed gaps (post-Continuation, 11 PENDING)

| finding type | count |
| --- | --- |
| MISSING (entity gap, deferred to Bucket 3) | 0 |
| STRUCTURAL | 6 |
| BOUNDARY | 4 |
| APQC TAGGING | 1 (1 row outstanding: handoff 946) |

#### STRUCTURAL findings (PENDING)

| # | id | finding | proposed fix | blocker |
| --- | --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows | Author the 4-or-5-module set per Pass-2 modularization (PATIENT-CARE, APPOINTMENTS, INVENTORY-RX, LAB-INTEGRATION, INVOICING). | Bucket 2.1 module shape |
| B1-S2 | A4 | `catalog_tagline` + `catalog_description` empty | Draft buyer-voice copy; surface to user for approval (Rule #20). | Bucket 2.2 wording |
| B1-S6 | B9 (missing handoff on event 1088) | `veterinary_vaccination.administered` has zero `handoffs` rows | Author 2 handoffs: -> CSM next-dose-reminder scheduling (mirrors 947 shape), -> GRC rabies-tag reporting (where state law requires). | Choice of integration_pattern + friction_level + target_module FKs (CSM resolvable; GRC waits on M1) |
| B1-S7 | B11 | Zero aliases on any master | Draft ~8 alias rows (most load-bearing: `pet_owners` <-> "Client"). | Rule #9 collision arbitration on "Client" canonical-claim |
| B1-S8 | B12 | Zero `data_object_lifecycle_states` across all 5 masters | Author state machines per the B12 list in the prior audit. | Bucket 2.5 (config-shape exemption check) |
| B1-S9 | F1 + F3 + F7 | Legacy skill + thin tool set; `send_email` channel link | Retire legacy skill after per-module skills are authored; redistribute tools per module; swap `send_email` for `notify_person` on reminder flows. | Bucket 2.1 (M1) |

#### BOUNDARY findings (PENDING)

| # | id | finding | proposed fix | blocker |
| --- | --- | --- | --- | --- |
| B1-B1 | B10b (outbound source FK) | All 6 outbound handoffs have `source_domain_module_id=NULL` | Backfill source_domain_module_id from VET-PRACT-MGMT's modules once authored. | M1 |
| B1-B2 | B8 (GRC mirrors) | No outbound `data_object_relationships` for `controlled_substance_ledger_entries -> GRC` payload and `veterinary_lab_results -> GRC` payload | Author edges once GRC's payload masters exist (likely `compliance_obligations` / `adverse_events`). | GRC M1 + GRC Phase B |
| B1-B3 | B8 (SUP-LIFE mirror) | No `data_object_relationships` for `controlled_substance_ledger_entries -> SUP-LIFE` reorder payload | Author edge once SUP-LIFE masters `supplier_orders` / `replenishment_orders`. | SUP-LIFE M1 + Phase B |
| B1-B4 | B8 (ERP-FIN mirror) | No `data_object_relationships` for `pet_owners -> ERP-FIN` payload (likely `customers` or `ar_accounts`) | Author edge once ERP-FIN masters the payload. | ERP-FIN M1 + Phase B |

#### APQC TAGGING (PENDING)

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-H1 | H1 | Handoff 946 (`pet_owner.registered` -> ERP-FIN) untagged | Classify or defer. Candidate processes: 303 "Process accounts receivable (AR)" (L3, mis-frames trigger); 736 "Collect and maintain account information" (L4, substrate fits). Recommend: defer to Discover Pass 3 custom-process authoring (the trigger is registration, not AR/AP), unless the user wants 736 as the best-available match. |

### Bucket 2 - Surface-for-user (judgment, 6 PENDING)

1. **Module shape (gates B1-S1, B1-S6 partial, B1-S9, B1-B1).** Options: (a) 5-module split as proposed; (b) 4-module split merging APPOINTMENTS into PATIENT-CARE; (c) 6-module split adding BOARDING.
2. **`catalog_tagline` + `catalog_description` wording (A4 / Rule #20).** User authors or approves buyer-voice copy.
3. **`pet_owners.has_personal_content`** PATCH to true? PII + state consumer-privacy law exposure.
4. **`controlled_substance_ledger_entries.has_submit_lock`** PATCH to true? DEA 21 CFR 1304 append-only requirement.
5. **B12 config-shape exemption check.** Confirm all 5 current masters carry workflow state machines (no config-shape exemption applies). Recommendation: confirm all 5 get B12 states loaded.
6. **C2 capability business-function overrides.** Load 3 override rows (VET-INVOICING -> AR, VET-INVENTORY-RX -> Compliance Ops, VET-REMINDER-MGMT -> Customer Service)?

### Bucket 3 - Phase 0 pending (6 PENDING)

Unchanged from prior audit (no vendor-surface re-spawn this run):

1. `veterinary_appointments` (IDEXX Cornerstone, ezyVet, AVImark scheduler) -> APPOINTMENTS or PATIENT-CARE depending on Bucket 2.1.
2. `veterinary_exam_notes` + `vaccination_reminder_protocols` (IDEXX SOAP, ezyVet clinical-records, AAHA/AVMA reminder rules) -> PATIENT-CARE.
3. `veterinary_prescriptions` + `vet_drug_inventory_items` + `dea_reports` (IDEXX Inventory Pro, Cubex, DEA Form 41 / 222) -> INVENTORY-RX.
4. `vet_invoices` + `vet_payment_transactions` (IDEXX integrated POS, ezyVet Stripe/Square) -> INVOICING.
5. `boarding_reservations` (AVImark boarding, Cornerstone boarding) -> BOARDING optional module.
6. `lab_test_orders` + `vet_species_breeds` (IDEXX VetLab / VetConnect Plus, Antech Lab) -> LAB-INTEGRATION + PATIENT-CARE.

### Report-only follow-ups (owed by other domains)

- **CSM B10b** owes target_domain_module_id on handoffs 337 + 947 (deterministic -> CSM-CASE-MGMT, id 112). Actionable today on CSM's audit.
- **CSM B8** could carry inbound `data_object_relationships` mirrors (`customer_cases triggered_by animal_patient.appointment_due` / `veterinary_vaccination.due`) but the existing 474 / 475 outbound rows already cover the substrate from this side.
- **GRC B10b + GRC B9** owe target FKs on 335 + 948 plus the GRC-side payload masters for DEA dispense and adverse-event reports. Gated on GRC M1.
- **SUP-LIFE B10b + B9** owe target FK on 336 + the SUP-LIFE side reorder payload master. Gated on SUP-LIFE M1.
- **ERP-FIN B10b + B9** owe target FK on 946 + the ERP-FIN AR-profile payload master. Gated on ERP-FIN M1.
- **S2P B9** owes outbound on `supplier_invoices.*` events to VET-PRACT-MGMT (this domain's contributor + required dependency on id 75).
- **Partner-module sparsity (informational):** GRC, SUP-LIFE, ERP-FIN remain M1-failing; auditing them is the highest-leverage follow-up for VET-PRACT-MGMT's B-band tail.

### Classification recap (b1a / b1b / b2 / b3)

- **b1a (agent-solvable, technically actionable now):** B1-S7 (aliases) is deterministic except for one Rule #9 collision arbitration (Client canonical-claim) which routes to Bucket 2-style ask. Net: zero pure-b1a items remain after the Continuation load; every Bucket 1 entry has either a Bucket 2 wording / decision gate, a partner-module prerequisite (b1b), or a Rule #20 / Rule #9 user-approval gate.
- **b1b (blocked):** B1-S1, B1-S2, B1-S6, B1-S7 (Rule #9 arbitration), B1-S8, B1-S9, B1-B1, B1-B2, B1-B3, B1-B4, B1-H1 (handoff 946). Each names the blocker explicitly in state.yaml.
- **b2 (user-judgment):** 6 items per Bucket 2 above.
- **b3 (Phase 0 pending):** 6 items per Bucket 3 above.
- **next_action_by:** `user` (b1a empty -> b2 non-empty).

## 2026-06-02 Audit (modularization)

### Summary

Built the domain's module layer. VET-PRACT-MGMT went from 0 to 3 `full` `domain_modules`, resolving the long-standing M1 hard fail (B1A-BUILD / B1B-M1-MODULES). Scope this pass was deliberately narrow: modules + capability links + assignment of the existing entities only. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created (those remain deferred per the prior audit's b2 / b3 items).

The prior B2-MODULE-SHAPE proposed a 4 / 5 / 6 module split, but every variant beyond 3 modules leaned on data_objects that do not exist yet (veterinary_appointments, vet_invoices, vet_payment_transactions, lab_test_orders, drug_inventory). With only the 5 existing in-domain masters (395-399) plus one borrowed contributor (supplier_invoices, id 75), a finer split would produce empty modules and violate the "every module >=1 data_object" rule. The 3-module shape places all 6 capabilities and all entities with no empty module. The richer split stays open as a future reshape once the B3 entities land.

### Module set authored

- **VET-PRACT-MGMT-CLINICAL-CARE** (id 321) - caps VET-PATIENT-CARE (428), VET-LAB-INTEGRATION (432), VET-REMINDER-MGMT (433). Masters: animal_patients (395), veterinary_vaccinations (397), veterinary_lab_results (398). Embedded: pet_owners (396).
- **VET-PRACT-MGMT-FRONT-OFFICE** (id 322) - caps VET-APPT-SCHED (429), VET-INVOICING (430). Master: pet_owners (396). Embedded: animal_patients (395). Contributor: supplier_invoices (75, required, role preserved from the borrowed AP master).
- **VET-PRACT-MGMT-PHARMACY-RX** (id 323) - cap VET-INVENTORY-RX (431). Master: controlled_substance_ledger_entries (399). Embedded: animal_patients (395).

All 3 carry `module_kind=full`, `industry_id=18` (Veterinary Services, NAICS 541940 - the single clear industry row). Descriptions are vendor-free (Rule #18) and em-dash-free.

### Master mapping (M7, in-domain AND catalog-wide)

| master | id | module |
|---|---|---|
| animal_patients | 395 | CLINICAL-CARE (321) |
| veterinary_vaccinations | 397 | CLINICAL-CARE (321) |
| veterinary_lab_results | 398 | CLINICAL-CARE (321) |
| pet_owners | 396 | FRONT-OFFICE (322) |
| controlled_substance_ledger_entries | 399 | PHARMACY-RX (323) |

Catalog-wide master pre-check before any `role=master` write: all 5 masters returned zero pre-existing master rows anywhere in the catalog, so all 5 stay `master` (no demotions to embedded_master required). pet_owners is dual-anchored (clinical + billing) but masters exactly once in FRONT-OFFICE and is embedded_master in CLINICAL-CARE; animal_patients masters in CLINICAL-CARE and is embedded_master in the two other modules where it is referenced.

### Counts

- 3 domain_modules, 6 domain_module_capabilities (3 + 2 + 1), 9 domain_module_data_objects (4 + 3 + 2).
- Verification (independent live re-query): every capability placed, every module non-empty on both caps and data_objects, each master exactly 1 row catalog-wide.

### Loader

`.tmp_deploy/modularize_vet_pract_mgmt_2026-06-02.ts`, idempotent (module key = domain_module_code, DMC key = (domain_module_id, capability_id), DMDO key = (domain_module_id, data_object_id)). Re-run made zero inserts.

### Deferred (unchanged, now partially unblocked by M1)

The B1B prerequisite gate on M1-MODULES is now cleared, so the following become technically authorable in a future pass (still each carry their own user-decision or partner-domain gate): per-module lifecycle states (B1B-B12, domain_module_id now assignable), per-module system skills + tool redistribution + legacy skill 116 retirement (B1B-F1-F3-F7-SKILL-LAYER), source_domain_module_id backfill on the 6 outbound handoffs (B1B-B10b), aliases (B1B-B11), and the per-module / domain catalog UX copy (M8 / A4). The B3 vendor-research entities (appointments, exam_notes, prescriptions, invoices, boarding, lab_orders) remain Phase-0 pending and would drive the future 4-6 module reshape.

### next_action_by

`agent` - new b1a items are now technically actionable post-M1 (per-module system skills F2/F3, per-module catalog UX M8/A4). Several still funnel into existing b2 user-decision gates, but the skill + catalog-UX scaffolding can proceed.
