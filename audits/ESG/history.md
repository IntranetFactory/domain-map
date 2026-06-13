# ESG audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 9 masters (no modules; pre-modular load), 0 capabilities, 7 solutions (3 primary, 4 secondary), 7 regulations (CSRD, SFDR, SEC Climate, TCFD, ESPR, EU Battery Reg, CBAM), 10 trigger events, 8 outbound + 1 inbound cross-domain handoffs, 0 intra-domain handoffs, 1 legacy domain-level system skill (`esg-system`) with 16 `skill_tools` rows (15 platform-required + 1 external-optional `generate_text`).
- Vendor-surface basis: Persefoni (climate-platform pure-play, CSRD/SEC anchor), Sphera ESG (regulated reporting + supply-chain), IBM Envizi (enterprise sustainability), Watershed (high-growth carbon-accounting pure-play), Salesforce Net Zero Cloud (CRM-aligned), Workiva (financial-reporting-tier disclosure), Diligent (GRC-aligned ESG). Plus Cority/Sphera for EHS-adjacent compliance, EcoVadis for supplier ratings. 7 flagships span the dual carbon-accounting + disclosure-reporting axes typical for the regulated ESG market.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.
- Candidates queued to `audits/_missing-domains.md`: PROD-CARBON-FOOTPRINT, SUSTAIN-PROC, CLIMATE-RISK (3 new).

Structural pass headline: ESG is a **pre-modular domain**. M1 hard-fails (zero `domain_modules`), which cascades into M2/M4/M5/M6/M7 vacuous-or-blocked, B-band DMDO checks all vacuous (data_objects sit on legacy `domain_data_objects` only), B10b stuck NULL on every handoff until modules ship, F2-F5 uncomputable, E vacuous. The legacy `esg-system` skill (F1) is the only system-skill row and will become an F1 cleanup once module-anchored skills land. C1 passes (ESG-and-Sustainability owner + Finance contributor). A1 passes on the seven domain-metadata fields, but `domains.business_logic` carries a forbidden em-dash that needs scrubbing. A4 fails on both catalog UX fields.

### Pass 1, Structural (per-domain completeness checklist)

#### S-band coverage sweep

S1, direct FKs to `domains`:

| Table | FK column | ESG rows | Expected non-zero? |
| --- | --- | --- | --- |
| `business_function_domains` | `domain_id` | 2 | yes (pass) |
| `capability_domains` | `domain_id` | 0 | yes (fails A2) |
| `domain_data_objects` | `domain_id` | 12 (9 master + 1 contributor + 2 consumer) | yes (pass) |
| `domain_modules` | `domain_id` | 0 | yes (fails M1, blocks everything) |
| `solution_domains` | `domain_id` | 7 | yes (pass) |
| `handoffs.source_domain_id` | source side | 8 | yes (pass) |
| `handoffs.target_domain_id` | target side | 1 | applicable, low but acceptable |
| `domain_regulations` | `domain_id` | 7 | yes (pass) |
| `skills.domain_id` | `domain_id` | 1 (legacy `esg-system`) | yes via F2 once modules ship |
| `domain_module_host_domains` | `domain_id` | 0 | typically zero |
| `domains.parent_domain_id` (sub-domains) | self-FK | 0 (no children; parent is GRC) | typically zero |

S2 per-module coverage: vacuous (no modules).
S3 per-master indirect coverage:

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| emissions_records | 0 | 1 (`emissions_record.ingested`) | 0 |
| emission_factors | 0 | 1 (`emission_factor.updated`) | 0 |
| activity_data_records | 0 | 1 (`activity_data.recorded`) | 0 |
| esg_targets | 0 | 1 (`emission_target.breached`) | 0 |
| esg_metrics | 0 | 1 (`esg_metric.threshold_breached`) | 0 |
| esg_disclosures | 0 | 2 (`submitted_for_assurance`, `assured`) | 0 |
| supplier_esg_assessments | 0 | 1 (`score_updated`) | 0 |
| facility_emissions | 0 | 1 (`reported`) | 0 |
| esg_initiatives | 0 | 1 (`launched`) | 0 |

S3 verdict: every master has at least one trigger_event (good), but zero lifecycle states (B12 fail catalog-wide) and zero aliases (B11 fail).

#### Band-by-band results (in-scope only; report-only routes are listed at the bottom)

| Band | Check | Status | Route |
| --- | --- | --- | --- |
| A1 | domain metadata fields | pass on values, FAIL on em-dash in `business_logic` | B1-S1 (STRUCTURAL) |
| A2 | capability count >= 3 | FAIL (0 capabilities) | B1-S2 (STRUCTURAL) |
| A3 | solutions >= 3 with coverage_level | pass | none |
| A4 | catalog_tagline / catalog_description | FAIL (both empty) | B1-S3 (STRUCTURAL) |
| M1 | >= 1 module | FAIL (zero modules) | B1-S4 (STRUCTURAL, blocking) |
| M2-M7 | module-shape checks | vacuous (no modules) | folded into B1-S4 |
| B1 | >= 1 master | pass (9 masters) | none |
| B2 | singular/plural labels | pass (all 9) | none |
| B3 | naming arbitration | pass (all 9 are prefixed or domain-noun phrases; no canonical bare-word claims needed) | none |
| B4 | pattern flags considered | UNCERTAIN (all flags false-by-default; no positive audit recorded; `esg_disclosures` likely needs `has_submit_lock=true`, `esg_targets` arguably `has_single_approver=true` for executive sign-off) | B1-S5 (STRUCTURAL) |
| B5 | embedded_master integrity | pass (no embedded_master rows; consumer/contributor rows point at suppliers, supplier_qualifications, financial_plans which carry `domain_data_objects.role=master` rows in SUP-LIFE / EPM / MDM) | none |
| B6 | intra-domain relationships | FAIL (zero rows across 9 masters; no `emission_factor -> emissions_record`, no `activity_data -> emissions_record`, no `esg_target -> esg_metric`, no `esg_disclosure -> esg_metric / facility_emissions`, no `facility_emissions -> emissions_record`) | B1-S6 (STRUCTURAL) |
| B7 | users edges | FAIL (zero rows across 9 masters; multiple masters carry human-typed actors: disclosure preparer, target owner, initiative sponsor, factor library steward) | B1-S7 (STRUCTURAL) |
| B8 | outbound cross-domain relationships | FAIL (only 1 row, `supplier_esg_assessments updates supplier_qualifications`; 7 of 8 outbound handoffs lack a mirroring relationship row) | B1-S8 (STRUCTURAL) |
| B9 | trigger_events + outbound handoffs | partial pass: 10 events cover the masters reasonably, but 3 events (ids 933 / 934 / 935) carry `event_category=""` (empty string outside the `lifecycle / state_change / threshold / signal` enum) | B1-S9 (STRUCTURAL) |
| B9b | intra-domain cross-module handoffs | vacuous (zero modules) | none |
| B10 | inbound handoffs | 1 inbound row (`utility_meter_reading.published` from REAL-EST 141); SUP-LIFE outbound on supplier-qualification changes is missing | report-only (Pass 4 below) |
| B10b | per-module attribution on handoffs | FAIL (all 9 handoff rows have NULL `source_domain_module_id` and NULL `target_domain_module_id`); ESG side is blocked by M1, target sides need their own audits | B1-S10 (STRUCTURAL) plus report-only |
| B11 | aliases | FAIL (zero aliases; vendor-synonym surface exists, e.g. emissions_records as "GHG records / activity emissions / scope 1+2+3 records", esg_disclosures as "sustainability reports / CSRD reports / 10-K climate disclosure") | B1-S11 (STRUCTURAL) |
| B12 | lifecycle states + pattern flags | FAIL (zero states; `esg_disclosures` has an explicit `draft -> submitted_for_assurance -> assured -> filed` lifecycle; `esg_targets` has `proposed -> approved -> active -> achieved/missed`; `facility_emissions` has `open -> locked -> filed`; `supplier_esg_assessments` has `requested -> in_progress -> scored -> recertified`) | B1-S12 (STRUCTURAL) |
| C1 | function-owner row | pass (ESG and Sustainability owner, Finance contributor) | none |
| C2 | function overrides on capabilities | vacuous (no capabilities) | none |
| D1 | UI spot-check | deferred | none |
| E1-E6 | roles & permission bundling | vacuous (no modules; 2-module floor blocks role authoring; the function spine has `ESG and Sustainability` with zero roles) | folded into B1-S4 (resolves when modules ship) |
| F1 | legacy domain-level system skill | FAIL eventually: `esg-system` (skill id 13) is `domain_id=21, domain_module_id=null`; will become a Rule #17 violation once module-anchored skills exist | B1-S13 (STRUCTURAL, becomes blocking after M1 is fixed) |
| F2 | one system skill per module | vacuous (no modules) | folded |
| F3 | skill_tools >= 1 | pass-by-accident (`esg-system` has 16 `skill_tools`) | none |
| F4 | operation_kind <-> data_object_id invariant | pass (15 query/mutate rows carry `data_object_id`; `generate_text` is compute with NULL) | none |
| F5 | Semantius score computable | uncomputable until F2 (no module anchor); strict score on the legacy skill is 15/16 = 94% (`generate_text` is external) | folded |
| F7 | channel abstractions | vacuous (no channel primitives linked) | none |
| H1 | APQC tags on cross-domain handoffs | FAIL (zero `handoff_processes` rows across 9 cross-domain handoffs; the volume target is 5-7 `agent_curated` proposals) | B1-S14 (APQC TAGGING) |

### Pass 2, Market audit (semantic)

Flagship-vendor surface synthesized from public docs and product pages: Persefoni, Sphera ESG, IBM Envizi, Watershed, Salesforce Net Zero Cloud, Workiva, Diligent ESG, plus Cority / EcoVadis at the adjacencies.

Union surface matrix (entities x vendor presence, classification per § domain-audit-procedure):

| Entity | Persefoni | Sphera | Envizi | Watershed | NZC | Workiva | Diligent | Classification |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| emissions_records | y | y | y | y | y | y | y | core (in catalog) |
| emission_factors | y | y | y | y | y | y | partial | core (in catalog) |
| activity_data_records | y | y | y | y | y | partial | partial | core (in catalog) |
| esg_targets | y | y | y | y | y | y | y | core (in catalog) |
| esg_metrics | y | y | y | y | y | y | y | core (in catalog) |
| esg_disclosures | y | y | y | partial | y | y | y | core (in catalog) |
| supplier_esg_assessments | y | y | partial | y | y | partial | y | core (in catalog) |
| facility_emissions | y | y | y | y | y | partial | partial | core (in catalog) |
| esg_initiatives | y | y | y | partial | y | y | y | core (in catalog) |
| **scope3_categories** | y | y | y | y | y | partial | partial | common, MISSING |
| **emission_calculation_runs** | y | y | y | y | partial | partial | partial | common, MISSING |
| **product_carbon_footprints** | y | y | partial | y | partial | partial | partial | common, MISSING (or candidate domain PROD-CARBON-FOOTPRINT) |
| **carbon_credit_purchases** | y | y | partial | y | y | partial | partial | common, MISSING |
| **renewable_energy_certificates** | y | y | y | y | y | partial | partial | common, MISSING |
| **assurance_engagements** | y | y | y | partial | y | y | y | compliance, MISSING (CSRD / ISSB Article 14, Article 19) |
| **double_materiality_assessments** | y | y | y | partial | partial | y | y | compliance, MISSING (CSRD ESRS 1 requirement) |
| **esg_disclosure_taxonomies** | y | partial | y | partial | partial | y | y | compliance, MISSING (XBRL / ESRS / GRI / SASB tag library) |
| **regulatory_change_records** | partial | y | partial | partial | partial | y | y | compliance, MISSING (CSRD / SEC update tracking) |
| **biodiversity_records** | partial | y | partial | partial | partial | partial | partial | specialist, defer to Bucket 3 |
| **water_usage_records** | y | y | y | partial | partial | partial | partial | specialist, defer to Bucket 3 |
| **waste_records** | y | y | y | partial | partial | partial | partial | specialist, defer to Bucket 3 |
| **esg_audit_evidence** | y | y | y | partial | partial | y | y | compliance, MISSING |
| **stakeholder_engagement_records** | partial | y | partial | partial | partial | y | y | specialist, defer to Bucket 3 |
| **scope3_supplier_surveys** | partial | y | partial | y | partial | partial | partial | common, MISSING (overlaps SUSTAIN-PROC candidate) |

Findings categories:

- **MISSING** (entities flagged above as MISSING): 9 entities. All go to Bucket 1 as candidates pending Bucket 3 vetting where vendor evidence is partial; the 5 compliance-mandated ones (assurance_engagements, double_materiality_assessments, esg_disclosure_taxonomies, regulatory_change_records, esg_audit_evidence) are non-optional regardless of vendor coverage.
- **WRONG-OWNERSHIP**: none surfaced (ESG masters are appropriately ESG-owned; the SUP-LIFE consumer is correct).
- **SCOPE-CREEP**: `financial_plans` consumer is plausible (sustainability-linked financial planning), but the necessity and the integration pattern are unclear given no inbound handoff exists. Surface for review.
- **MODULARIZATION ISSUE**: severe. Zero modules. The 9 masters cluster naturally into 4 to 5 modules: ESG-CARBON-ACCOUNTING (emissions_records, emission_factors, activity_data_records, facility_emissions), ESG-DISCLOSURE-REPORTING (esg_disclosures + new assurance / materiality / taxonomy entities), ESG-PERFORMANCE-MGMT (esg_targets, esg_metrics, esg_initiatives), ESG-SUPPLIER-SUSTAINABILITY (supplier_esg_assessments + scope3_supplier_surveys). Optionally ESG-PRODUCT-FOOTPRINT if product_carbon_footprints lands in-domain rather than as a separate domain.

Candidates queued to `audits/_missing-domains.md`:
- `PROD-CARBON-FOOTPRINT` (Product Carbon Footprint Management): pure-play vendors include Watershed, Sphera Product Sustainability, CarbonChain, Sweep, Makersite, Persefoni. Vendor evidence and adjacency captured in the queue file.
- `SUSTAIN-PROC` (Sustainable Procurement Intelligence): EcoVadis, IntegrityNext, Sphera Supply Chain, Achilles, Sedex.
- `CLIMATE-RISK` (Climate Risk Analytics): Jupiter Intelligence, Cervest, Climate X, Risilience, S&P Climanomics.

EHS-MGMT is already in the queue (REAL-EST + FSQM surfacers); not re-surfaced here but ESG should be added to its adjacency list at human review time.

### Pass 3, Neighbor discovery

Cross-edges sourced from `handoffs` + `domain_data_objects` dependencies (DMDO is empty because there are no ESG modules):

| Neighbor | Edge type | Weight | Notes |
| --- | --- | --- | --- |
| AUDIT (16) | handoffs out (3) | 3 | emissions_records ingested, esg_disclosures submitted_for_assurance, esg_initiatives launched |
| GRC (15) | handoffs out (2) | 2 | esg_targets breached, emission_factors updated |
| SUP-LIFE (28) | handoffs out (1) + DMDO consumer/contributor (2) | 3 | supplier_esg_assessments score_updated; ESG consumes suppliers + supplier_qualifications |
| EPM (66) | DMDO consumer (1) | 1 | ESG consumes financial_plans |
| REAL-EST (141) | handoff in (1) | 1 | inbound utility_meter_reading.published |
| TPRM (19) | handoff out (1) | 1 | supplier_esg_assessments score_updated also fanned to TPRM |
| FINOPS (41) | handoff out (1) | 1 | activity_data.recorded targeted at FINOPS (looks like target mis-routing; see Bucket 2 #5) |
| MDM (87) | DMDO conflict | cross-only | catalog-wide M7 hard fail: `suppliers` (data_object_id 206) carries `domain_data_objects.role=master` in BOTH SUP-LIFE and MDM; surfaced for SUP-LIFE / MDM owners, not blocking ESG's pass |

Pass 4 deep dive runs against AUDIT (weight 3), GRC (weight 2), SUP-LIFE (weight 3). Others get one-line summaries.

### Pass 4, Pairwise reconciliation per neighbor

#### Neighbor: AUDIT (weight 3)

A->B (ESG to AUDIT) shape, 3 outbound handoffs:

1. `emissions_record.ingested` (event 252) -> AUDIT (handoff 275, integration_pattern=api_call, friction=medium)
2. `esg_disclosure.submitted_for_assurance` (event 254) -> AUDIT (handoff 276, integration_pattern=api_call, friction=high)
3. `esg_initiative.launched` (event 935) -> AUDIT (handoff 852, integration_pattern=event_stream, friction=low)

5-section diff:

1. **Existing handoffs, fully wired**: 0. All 3 carry NULL `source_domain_module_id` (ESG has no modules) and NULL `target_domain_module_id` (AUDIT module attribution not run from this side).
2. **NULL module FK candidates for PATCH**: source side stays NULL until ESG-CARBON-ACCOUNTING / ESG-DISCLOSURE-REPORTING modules ship. Target-side patch is AUDIT's B10b responsibility.
3. **Missing handoffs the catalog implies**: candidate `esg_disclosure.assured` (event 255) plausibly fans to AUDIT for audit-trail retention; surface for review.
4. **Boundary integrity gaps**: none from this side.
5. **Cross-domain `data_object_relationships`**: missing for 2 of 3 handoffs: `emissions_records -> audit_engagements / audit_evidence`, `esg_initiatives -> audit_engagements`. The `esg_disclosure -> audit_engagement` direction exists from AUDIT side (relationship row 293 reviews 326, owner_side=source).

B->A (AUDIT to ESG): 0 handoffs. None implied.

#### Neighbor: SUP-LIFE (weight 3)

A->B (ESG to SUP-LIFE), 1 outbound handoff:

1. `supplier_esg_assessment.score_updated` (event 256) -> SUP-LIFE (handoff 277, integration_pattern=api_call, friction=medium)

ESG consumes 2 SUP-LIFE entities (suppliers required-consumer, supplier_qualifications required-contributor).

5-section diff:

1. **Existing handoffs, fully wired**: 0 (NULL module FKs both sides).
2. **NULL module FK candidates**: both sides stay NULL until ESG modules ship; SUP-LIFE side likewise depends on SUP-LIFE modularization.
3. **Missing handoffs the catalog implies**: SUP-LIFE owes ESG outbound on `supplier.onboarded` (so ESG can request initial sustainability assessment) and on `supplier_qualification.updated` (so ESG can refresh scoring inputs). Both go to report-only.
4. **Boundary integrity gaps**: `suppliers` (206) is multi-mastered between SUP-LIFE and MDM. Surface as report-only for SUP-LIFE / MDM owners.
5. **Cross-domain `data_object_relationships`**: 1 row exists (`supplier_esg_assessments updates supplier_qualifications`). Missing inverse direction (supplier_qualifications -> supplier_esg_assessments) and `suppliers -> supplier_esg_assessments` ownership edge.

B->A (SUP-LIFE to ESG): 0 handoffs published. Two implied (see section 3 above) and routed to SUP-LIFE B9.

#### Neighbor: GRC (weight 2)

A->B (ESG to GRC), 2 outbound handoffs:

1. `emission_target.breached` (event 253) -> GRC (handoff 279, integration_pattern=event_stream, friction=medium)
2. `emission_factor.updated` (event 933) -> GRC (handoff 850, integration_pattern=batch_sync, friction=medium)

Diff:

1. Fully wired: 0 (NULL module FKs).
2. NULL FK: same module-not-yet pattern.
3. Missing implied: GRC should reciprocate with regulatory-policy-change handoffs that drive `emission_factor` updates; surface as report-only for GRC.
4. Boundary integrity: none.
5. Relationship rows: missing `emission_targets -> risk_assessments` (or whichever GRC master subscribes to the breach), missing `emission_factors -> regulatory_policies`.

#### Lighter neighbors (one-line summaries)

- **TPRM (1 handoff out)**: `supplier_esg_assessment.score_updated` (event 256) also fans to TPRM (handoff 278, friction=high). High friction needs justification at human review (does TPRM consume the full assessment or just a risk-band signal?). Cross-domain relationship row missing.
- **FINOPS (1 handoff out)**: `activity_data.recorded` (event 934) -> FINOPS (handoff 851). Looks like mis-targeting (FINOPS in this catalog is "Cloud Financial Operations", not financial planning). Surface as Bucket 2 question: should target be EPM, not FINOPS, given ESG also consumes EPM's `financial_plans`?
- **REAL-EST (1 inbound)**: `utility_meter_reading.published` (event 284) lands on ESG; payload `utility_meter_readings` (350) has no ESG consumer DMDO row (because ESG has no modules). When ESG-CARBON-ACCOUNTING module ships, a `consumer + required` DMDO row on `utility_meter_readings` should land alongside.
- **EPM (DMDO dep only)**: ESG consumes `financial_plans` (37). No handoff exists in either direction; either the consumer link is speculative scope-creep or EPM owes outbound on `financial_plan.updated`. See Bucket 2 #2.

### Bucket 1, In-scope confirmed gaps

#### MISSING (compliance-mandated entities, non-optional)

| ID | Entity | Proposed module | Regulation | Notes |
| --- | --- | --- | --- | --- |
| B1-M1 | `assurance_engagements` | ESG-DISCLOSURE-REPORTING | CSRD Art. 14, SEC Climate Rule | CSRD mandates third-party assurance of sustainability statements; required scope of work, scope, period, assurance level (limited or reasonable), assurance provider. |
| B1-M2 | `double_materiality_assessments` | ESG-DISCLOSURE-REPORTING | CSRD ESRS 1 | Two-axis (impact + financial materiality) assessment is a CSRD entry-condition; sub-records per topic, stakeholder input, materiality threshold. |
| B1-M3 | `esg_disclosure_taxonomies` | ESG-DISCLOSURE-REPORTING | CSRD ESRS, ISSB, GRI, SASB | Tag library for XBRL / ESRS / GRI / SASB mappings; one row per taxonomy + version + concept; required for Workiva / Persefoni / Envizi-style multi-framework reporting. |
| B1-M4 | `regulatory_change_records` | ESG-DISCLOSURE-REPORTING | CSRD, SEC Climate, CBAM | Tracking of statutory updates that change disclosure or measurement requirements; Sphera / Diligent / Workiva all master this. |
| B1-M5 | `esg_audit_evidence` | ESG-DISCLOSURE-REPORTING | CSRD assurance, SOX-adjacent | Audit-trail evidence rows linked to disclosure assertions; assurance providers require these as part of the engagement walkthrough. |

#### MISSING (universal-vendor entities, non-regulatory)

| ID | Entity | Proposed module | Notes |
| --- | --- | --- | --- |
| B1-U1 | `scope3_categories` | ESG-CARBON-ACCOUNTING | GHG Protocol Scope 3 lists 15 categories; the catalog needs a typed reference to which category an emissions_records or supplier survey rolls up to. Universal across all 7 flagships. |
| B1-U2 | `emission_calculation_runs` | ESG-CARBON-ACCOUNTING | Each calculation pass against an emission_factor + activity_data set produces a versioned run; required for recalculation history (Persefoni / Watershed / Envizi all master this). |
| B1-U3 | `carbon_credit_purchases` | ESG-CARBON-ACCOUNTING | Offset / removal credit purchases linked to emissions_records; Persefoni, Watershed, NZC, Sphera carry this; required to support "net" disclosures. |
| B1-U4 | `renewable_energy_certificates` | ESG-CARBON-ACCOUNTING | RECs / GOs / I-RECs linked to facility_emissions for Scope 2 market-based reporting. Universal. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-S1 | A1 | `domains.business_logic` for ESG contains an em-dash (U+2014). Project rule "No em-dashes" forbids this character in all DB-sourced content. | PATCH the field to replace the em-dash with a comma or sentence break. Proposed wording stays buyer-neutral and analyst-voiced. |
| B1-S2 | A2 / capability_domains | Zero `capabilities` and zero `capability_domains` rows for ESG. The market clearly fields 5+ capabilities (carbon accounting, sustainability target management, disclosure preparation, supplier sustainability, regulatory change tracking, climate scenario analysis). | Load 5 to 7 capabilities + `capability_domains` rows. Apply Cross-cutting capability convention for any that span >=3 domains (e.g. SUPPLIER-SUSTAINABILITY-SCORING). |
| B1-S3 | A4 / Rule 20 | `catalog_tagline` and `catalog_description` are both empty. | Draft buyer-voice text (workflow + value), surface to user before writing per Rule 20 (do not overwrite if non-empty; here both are empty so initial fill is allowed with explicit review). |
| B1-S4 | M1 (blocking) | Zero `domain_modules` rows. Cascades to M2 / M4 / M5 / M6 / M7 / B-band DMDO checks / E-band / F2-F5. | Hand-author the module set. Proposed 4 modules: ESG-CARBON-ACCOUNTING (masters: emissions_records, emission_factors, activity_data_records, facility_emissions + new scope3_categories, emission_calculation_runs, carbon_credit_purchases, renewable_energy_certificates), ESG-DISCLOSURE-REPORTING (masters: esg_disclosures + new assurance_engagements, double_materiality_assessments, esg_disclosure_taxonomies, regulatory_change_records, esg_audit_evidence), ESG-PERFORMANCE-MGMT (masters: esg_targets, esg_metrics, esg_initiatives), ESG-SUPPLIER-SUSTAINABILITY (masters: supplier_esg_assessments + new scope3_supplier_surveys). 4 modules cleanly cover the surface; 5 if PROD-CARBON-FOOTPRINT becomes a sub-domain rather than a separate domain. |
| B1-S5 | B4 | Pattern flags all default-false; no positive audit recorded. Candidates: `esg_disclosures` (`has_submit_lock=true` after `submitted_for_assurance`), `esg_targets` (`has_single_approver=true` for executive sign-off), `facility_emissions` (`has_submit_lock=true` on period close), `assurance_engagements` (`has_single_approver=true` for lead auditor). | PATCH the four masters; record consideration in the audit (not in `notes`, per Rule 15). |
| B1-S6 | B6 | Zero intra-domain `data_object_relationships` across the 9 masters. Required edges: `emission_factors applies_to emissions_records`, `activity_data_records sources emissions_records`, `facility_emissions rolls_up emissions_records`, `esg_targets governs esg_metrics`, `esg_metrics summarizes emissions_records`, `esg_disclosures reports esg_metrics`, `esg_disclosures reports facility_emissions`, `esg_initiatives drives esg_targets`. | Author 8 to 10 edges (verb + inverse_verb + cardinality + relationship_kind + is_required + owner_side); load via the cluster-drafts pattern. |
| B1-S7 | B7 / Rule 10 | Zero `users` edges across the 9 masters. Required edges: `esg_disclosures preparer / approver`, `esg_targets owner / approver`, `esg_initiatives sponsor`, `emission_factors steward`, `assurance_engagements lead_auditor`, `facility_emissions reporter`, `supplier_esg_assessments assessor`. | Author 7 to 9 user-edges per Rule 10. |
| B1-S8 | B8 | Only 1 outbound cross-domain `data_object_relationships` row (supplier_esg_assessments updates supplier_qualifications). 7 of 8 cross-domain handoffs lack a mirroring relationship row. | Author the missing rows alongside Pass 4 findings: `emissions_records evidences audit_engagements`, `esg_disclosures filed_under audit_engagements`, `esg_initiatives reviewed_in audit_engagements`, `esg_targets surfaces_to risk_registers (GRC)`, `emission_factors derived_from regulatory_policies (GRC)`, `supplier_esg_assessments feeds tprm_supplier_risk_records (TPRM)`, plus the disputed activity_data -> EPM / FINOPS edge after Bucket 2 #5 resolves. |
| B1-S9 | B9 / Rule 13 | 3 trigger_events (ids 933, 934, 935) carry `event_category=""` (empty string outside enum `lifecycle / state_change / threshold / signal`). | PATCH event_category to `lifecycle` for `activity_data.recorded` (id 934) and `esg_initiative.launched` (id 935); PATCH `emission_factor.updated` (id 933) to `state_change`. |
| B1-S10 | B10b | All 9 ESG-touching handoffs (8 outbound + 1 inbound) carry NULL `source_domain_module_id` and NULL `target_domain_module_id`. ESG source side is blocked by M1; ESG target side (one row 293) waits for ESG modules to ship. | PATCH after B1-S4 lands; deterministic derivation per B10b procedure. Target-side NULLs on the other domains' rows are report-only. |
| B1-S11 | B11 | Zero `data_object_aliases` rows across 9 masters. Recommended aliases per master are listed in the B11 finding row above (e.g. emissions_records as "GHG records / scope1+2+3 records"; esg_disclosures as "sustainability reports / CSRD reports / 10-K climate disclosures"). | Draft alias rows (alias_name + alias_type); bundle into a focused loader. |
| B1-S12 | B12 / Rule 12 | Zero `data_object_lifecycle_states` rows across 9 masters. Workflow-bearing masters: esg_disclosures (`draft / submitted_for_assurance / assured / filed`), esg_targets (`proposed / approved / active / achieved / missed`), facility_emissions (`open / locked / filed`), supplier_esg_assessments (`requested / in_progress / scored / recertified`), emission_factors (`active / superseded`), esg_initiatives (`planned / launched / in_progress / completed`). Config-shaped masters (emission_factors arguably) need the Rule 12 exemption surfaced (not auto-written to `notes`). | Author states for 6 masters + flag the 2 config-shape candidates for user judgment; load via a focused loader. |
| B1-S13 | F1 | Legacy `esg-system` (skill id 13) is `domain_id=21, domain_module_id=null`. Pre-modular relic. Will become an F1 violation as soon as module-anchored system skills ship under B1-S4. | DELETE the legacy row when the 4 new module-anchored system skills are authored (one per module, per Rule 17). Until then, leave (transitional state). |

#### BOUNDARY

| ID | Finding | Fix |
| --- | --- | --- |
| B1-B1 | Handoff 851 (`activity_data.recorded` -> FINOPS 41) looks like target mis-routing. FINOPS in this catalog is Cloud Financial Operations; activity_data recording is more naturally consumed by EPM (financial planning) or stays internal to ESG. | Surface to user (Bucket 2 #5). Do not delete unilaterally. |

#### APQC TAGGING (per-handoff PCF activity classification)

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 275 | ESG -> AUDIT | emissions_record.ingested | emissions_records | Measure sustainability performance | 2016 | confident L5 (anchor: PCF 21602) |
| 276 | ESG -> AUDIT | esg_disclosure.submitted_for_assurance | esg_disclosures | Perform sustainability reporting | 1802 | confident L4 |
| 277 | ESG -> SUP-LIFE | supplier_esg_assessment.score_updated | supplier_esg_assessments | Monitor/Manage supplier information | 815 | confident L4 |
| 278 | ESG -> TPRM | supplier_esg_assessment.score_updated | supplier_esg_assessments | Monitor/Manage supplier information | 815 | confident L4 (same as 277 by event) |
| 279 | ESG -> GRC | emission_target.breached | esg_targets | Measure sustainability performance | 2016 | confident L5 |
| 850 | ESG -> GRC | emission_factor.updated | emission_factors | Monitor legal and regulatory environment | 232 | confident L3 |
| 851 | ESG -> FINOPS | activity_data.recorded | activity_data_records | (deferred to Bucket 2 #5; tag after target is confirmed) | n/a | defer |
| 852 | ESG -> AUDIT | esg_initiative.launched | esg_initiatives | Perform sustainability reporting | 1802 | confident L4 |
| 293 | REAL-EST -> ESG | utility_meter_reading.published | utility_meter_readings | (inbound; REAL-EST H1 owes the tag) | n/a | report-only |

Volume: 7 `agent_curated` proposals + 1 deferred + 1 inbound (report-only). Target volume per H1 was 0.5N to 0.8N = 4.5 to 7.2 across 9 cross-domain handoffs; the proposal set is at the upper end of the band.

B1-S14 = the APQC TAGGING block above (counted as one B1 line item per project counting convention).

### Bucket 2, Surface-for-user (judgment calls)

1. **Capability-domain split for ESG.** Should "carbon accounting" and "ESG disclosure reporting" be one capability or two? Vendors split (Watershed = accounting-first; Workiva = disclosure-first; Persefoni = both). Independent of Bucket 3.
2. **`financial_plans` consumer link.** ESG consumes `financial_plans` (data_object 37, mastered in EPM) as `consumer + required`. No handoff exists in either direction. Options: (a) keep, and request EPM B9 to publish `financial_plan.updated` outbound to ESG (so sustainability-linked financial planning has a real edge), (b) downgrade to `optional` and document as forward-looking, (c) remove as scope-creep. Independent of Bucket 3.
3. **Pattern flag positive review on 4 masters.** B1-S5 proposes flags for `esg_disclosures` (has_submit_lock), `esg_targets` (has_single_approver), `facility_emissions` (has_submit_lock), `assurance_engagements` (has_single_approver). User confirms or vetoes each.
4. **Modularization recommendation acceptance.** B1-S4 proposes 4 modules. Acceptance options: (a) approve the 4-module shape, (b) collapse PERFORMANCE-MGMT into DISCLOSURE-REPORTING and ship 3 modules, (c) split SUPPLIER-SUSTAINABILITY into its own SUSTAIN-PROC domain (Bucket 3 candidate). The choice changes how Bucket 3 vetting routes.
5. **Handoff 851 target re-routing (`activity_data.recorded` -> FINOPS).** FINOPS in this catalog is Cloud Financial Operations. Options: (a) re-target to EPM (financial planning) if the intent was sustainability-linked planning, (b) remove the handoff if the workflow stays internal to ESG, (c) keep if the catalog's FINOPS scope was extended at some point and the routing is correct. The APQC tag in B1-S14 defers until this resolves.
6. **Config-shape exemption for emission_factors.** The Phase B lifecycle of `emission_factors` is plausibly config-shape (author-once / occasionally-edit reference data from EPA / DEFRA / IPCC) without a true workflow. Rule 12 / Rule 15 say: surface the exemption to the user, do not auto-write to `notes`. User decides whether `emission_factors` gets a 2-state `active / superseded` lifecycle or rides the config-shape exemption.

### Bucket 3, Phase 0 pending (speculative)

| ID | Candidate | Vendor evidence (which flagship sourced it) | Recommended verification |
| --- | --- | --- | --- |
| B3-1 | `biodiversity_records` | Sphera, partial coverage in Persefoni / Workiva / Diligent | Phase 0 vendor research against TNFD-aligned vendors |
| B3-2 | `water_usage_records` (as ESG master or in EHS-MGMT) | Persefoni, Sphera, Envizi | Phase 0; could fold to EHS-MGMT if that domain promotes from candidate queue |
| B3-3 | `waste_records` (as ESG master or in EHS-MGMT) | Persefoni, Sphera, Envizi | Phase 0 same as B3-2 |
| B3-4 | `stakeholder_engagement_records` | Sphera, Workiva, Diligent | Phase 0; CSRD requires stakeholder evidence for double materiality |
| B3-5 | `scope3_supplier_surveys` (in ESG-SUPPLIER-SUSTAINABILITY or in SUSTAIN-PROC candidate) | Sphera, Watershed | Phase 0; the candidate SUSTAIN-PROC domain may absorb this; if SUSTAIN-PROC promotes, this folds there |
| B3-6 | `product_carbon_footprints` (in ESG or in PROD-CARBON-FOOTPRINT candidate) | Watershed, Sphera, Persefoni | Phase 0; PROD-CARBON-FOOTPRINT candidate is queued; vetting may pull this entirely out of ESG |

### Cross-bucket dependencies

- **Bucket 2 #4 (module shape) depends on Bucket 3 #5 and #6.** If PROD-CARBON-FOOTPRINT and SUSTAIN-PROC promote out of the queue as standalone domains, the proposed ESG module ESG-PRODUCT-FOOTPRINT and the ESG-SUPPLIER-SUSTAINABILITY module simplify. Recommend resolving Bucket 3 first via eyeball-mode (vendors are well known) before deciding Bucket 2 #4.
- **Bucket 1 B1-M1 through B1-M5 (compliance MISSING) are independent of Bucket 2 / Bucket 3.** All 5 are CSRD / SEC-Climate mandates and load regardless of the modularization choice in Bucket 2 #4.
- **Bucket 2 #5 (handoff 851 target) blocks B1-S14's tag for that handoff but no other Bucket 1 item.**
- **Bucket 2 #6 (emission_factors lifecycle exemption) shapes B1-S12's authoring scope but does not block the other 5 masters' lifecycle states.**
- Otherwise the buckets are independent and resolve in any order.

### Per-bucket prompts

- After Bucket 1: *"Fix these now? Reply 'all', 'just X, Y, Z', or 'skip'. Note B1-S4 is the blocking gate; without modules, B1-S10 / B1-S13 stay deferred and F2-F5 stay vacuous."*
- After Bucket 2: *"What's your call on each of the 6 judgment questions? I'll wait for your decision per item before acting. For Rule-15 affected wording (B1-S3 catalog UX text), please supply or approve the exact text before any write."*
- After Bucket 3: *"Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true (e.g. 'product_carbon_footprints belongs in PROD-CARBON-FOOTPRINT candidate; water + waste + biodiversity belong in EHS-MGMT candidate'). Bucket 2 #4 is held until you settle this."*

### Report-only follow-ups (owed by other domains)

These are observations the user can act on by scheduling audits of the owning domains. They never block ESG's pass.

| Owed by | Check | Detail |
| --- | --- | --- |
| AUDIT | B10b | All 3 ESG -> AUDIT handoff rows (275, 276, 852) carry NULL `target_domain_module_id`; AUDIT's B10b should resolve after AUDIT modules ship. |
| GRC | B10b | Both ESG -> GRC handoff rows (279, 850) carry NULL `target_domain_module_id`. |
| SUP-LIFE | B10b | ESG -> SUP-LIFE handoff (277) NULL `target_domain_module_id`. |
| TPRM | B10b | ESG -> TPRM handoff (278) NULL `target_domain_module_id`; the `friction_level=high` value also warrants TPRM-side review. |
| FINOPS | B10b + B1 sanity | ESG -> FINOPS handoff (851) NULL on target; also depends on Bucket 2 #5 resolution (the routing may be wrong, in which case the handoff moves or deletes). |
| REAL-EST | B10b + B9 | REAL-EST -> ESG handoff (293) NULL on both module FKs; REAL-EST also owns the outbound side (event 284, `utility_meter_reading.published`). |
| SUP-LIFE | B9 | SUP-LIFE owes outbound on `supplier.onboarded` (so ESG can request initial sustainability assessment) and on `supplier_qualification.updated`. |
| EPM | B9 | EPM owes outbound on `financial_plan.updated` to ESG (depending on Bucket 2 #2 resolution). |
| SUP-LIFE / MDM | M7 | Catalog-wide hard fail: `suppliers` (data_object_id 206) is mastered in BOTH SUP-LIFE and MDM via `domain_data_objects.role=master`. The deployer cannot pick a canonical owner. Decision belongs to SUP-LIFE / MDM owners (preference: MDM masters, SUP-LIFE embedded_master), not to ESG. |
| AUDIT | B8 | Inbound (AUDIT -> ESG) relationship row 293 exists (`reviews esg_disclosures`); the inverse (ESG `submitted_to` AUDIT) is missing on AUDIT's B8. |

## 2026-05-31, Continuation: B1 technical fixes

### Scope

Subagent run under domain-map-analyst applied truly-technical, judgment-free B1 items from the 2026-05-30 audit. All deferrals (new entities, modules, capabilities, lifecycle states, relationships, aliases, pattern flags, catalog UX text) are held for the human turn.

### Applied

- **B1-S1** (em-dash scrub). PATCH `domains.id=21.business_logic`. Em-dash (U+2014) replaced with a comma. Verified post-write. Loader scope: 1 row.
- **B1-S9** (trigger_events enum backfill). PATCH `trigger_events.event_category` for the three ESG rows with empty enum values. Audit pre-specified targets: `933 emission_factor.updated -> state_change`, `934 activity_data.recorded -> lifecycle`, `935 esg_initiative.launched -> lifecycle`. Verified post-write. Loader scope: 3 rows.
- **B1-S14** (APQC handoff_processes tagging). INSERT 7 of the 9 audit-pre-specified `(handoff_id, process_id)` tuples. Pre-flight verified no key collisions. `proposal_source=agent_curated`; `record_status` omitted per Rule #1 (defaults to `new`); `notes` omitted per Rule #15. New row IDs: 702 (275->2016), 703 (276->1802), 704 (277->815), 705 (278->815), 706 (279->2016), 707 (850->232), 708 (852->1802). Note 278 also retains the prior `278->167` tag (row id 254) as a complementary classification.

Loader: [.tmp_deploy/fix_esg_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_esg_b1_technical_2026_05_31.ts). Run from project root.

### Deferred (held for human turn)

| ID | Reason for deferral |
| --- | --- |
| B1-M1..M5 | New entities (assurance_engagements, double_materiality_assessments, esg_disclosure_taxonomies, regulatory_change_records, esg_audit_evidence). |
| B1-U1..U4 | New entities (scope3_categories, emission_calculation_runs, carbon_credit_purchases, renewable_energy_certificates). |
| B1-S2 | New capabilities + new `capability_domains` rows; judgment + Bucket 2 #1 interaction. |
| B1-S3 | Catalog UX text (`catalog_tagline`, `catalog_description`); Rule #20 routing, user must approve wording. |
| B1-S4 | New modules (blocking gate; modularization shape is Bucket 2 #4). |
| B1-S5 | Pattern flag flips; explicitly deferred per subagent scope. |
| B1-S6 | New intra-domain `data_object_relationships`; audit lists candidate verbs but not pre-specified tuples with row ids. |
| B1-S7 | New users-edges `data_object_relationships`; audit names candidate roles but does not pre-specify tuples per Rule #10. |
| B1-S8 | New cross-domain `data_object_relationships`; audit lists candidate edges but not pre-specified tuples. |
| B1-S10 | B10b FK PATCHes blocked: ESG source side requires modules to exist (gated on B1-S4); target sides are owned by other domains' B10b audits. |
| B1-S11 | New `data_object_aliases`; audit lists candidate aliases descriptively, no pre-specified tuples. |
| B1-S12 | New `data_object_lifecycle_states`; new rows beyond the technical scope. Also interacts with Bucket 2 #6. |
| B1-S13 | Audit explicitly states: leave legacy `esg-system` (skill id 13) until module-anchored skills land under B1-S4. Not currently stale. |
| B1-B1 | Handoff 851 target re-routing; explicitly Bucket 2 #5 (surface to user). |

Bucket 2 (6) and Bucket 3 (6) remain untouched, awaiting user judgment.

### Handoff 851 and 293 PCF tags

Both already had `handoff_processes` rows applied prior (id 674 for `851->1802`, id 397 for `293->1783`). The 2026-05-30 audit marked 851 as "defer" and 293 as "report-only" (REAL-EST H1 owes). No further action this turn; the pre-existing rows are left in place.

### JWT errors

None.

## 2026-05-31, Audit

### Summary

- Current footprint: 9 ESG-owned masters (no modules; ESG remains pre-modular), 0 capabilities, 7 solutions, 7 regulations, 10 trigger_events (3 enum-backfilled on 2026-05-31), 8 outbound + 1 inbound cross-domain handoffs, 0 intra-domain handoffs, 1 legacy `esg-system` skill with 16 `skill_tools`. APQC tagging now covers 9/9 cross-domain handoffs (all `agent_curated`, `record_status=new`).
- Vendor surface basis (from prior pass, unchanged): Persefoni, Sphera ESG, IBM Envizi, Watershed, Salesforce Net Zero Cloud, Workiva, Diligent ESG, plus Cority / EcoVadis at the adjacencies.
- Bucket 1 (in-scope, agent fixable): 13 items pending.
- Bucket 2 (surface-for-user, judgment): 6 items pending.
- Bucket 3 (Phase 0 pending, speculative): 6 items pending.

### Structural pass headline

ESG is still a pre-modular domain. M1 hard-fails (zero `domain_modules`), which cascades: M2-M7 vacuous, B-band DMDO checks vacuous (data_objects sit on legacy `domain_data_objects` only), B10b NULL on every handoff (source side), E1-E5 vacuous, F2-F5 uncomputable, B9b vacuous. Closed since 2026-05-30: B1-S1 (em-dash scrub on `domains.business_logic`), B1-S9 (trigger_events 933/934/935 enum-backfilled), B1-S14 (9/9 handoffs APQC-tagged including 278->167 and 278->815 dual-tag, 851->1802 and 293->1783).

### Band-by-band results (delta vs. 2026-05-30)

| Band | Check | Status | Notes |
| --- | --- | --- | --- |
| A1 | domain metadata + em-dash | pass (em-dash scrubbed) | none |
| A2 | capability_count >= 3 | FAIL (0 capabilities) | B1-S2 |
| A3 | solutions >= 3 | pass | none |
| A4 | catalog_tagline / catalog_description | FAIL (both empty) | B1-S3 (Rule 20) |
| M1 | >= 1 module | FAIL (zero modules; blocking) | B1-S4 |
| M2-M7 | module-shape | vacuous (folded into B1-S4) | none |
| B1 | >= 1 master | pass (9) | none |
| B2 | singular/plural labels | pass | none |
| B3 | naming arbitration | pass | none |
| B4 | pattern flags considered | UNCERTAIN (all default-false; positive review still owed on 4 masters) | B1-S5 / Bucket 2 #3 |
| B5 | embedded_master integrity | pass (no embedded_master rows; suppliers (206) is multi-mastered SUP-LIFE+MDM, report-only) | none |
| B6 | intra-domain `data_object_relationships` | FAIL (zero rows across 9 masters) | B1-S6 |
| B7 | `users` edges | FAIL (zero rows) | B1-S7 |
| B8 | outbound cross-domain `data_object_relationships` | FAIL (1/8 covered: only `supplier_esg_assessments updates supplier_qualifications`) | B1-S8 |
| B9 | outbound trigger_events + handoffs | pass (10 events, 3 enum-backfilled this cycle) | none |
| B9b | intra-domain cross-module handoffs | vacuous (zero modules) | folded into B1-S4 |
| B10 | inbound handoffs | 1 row (293 from REAL-EST); report-only | report-only |
| B10b | per-module attribution on handoffs | FAIL on source side, 9/9 NULL `source_domain_module_id`; target sides report-only | B1-S10 (blocked by B1-S4) |
| B11 | aliases | FAIL (zero aliases across 9 masters) | B1-S11 |
| B12 | lifecycle states + pattern flags | FAIL (zero states across 9 masters) | B1-S12 / Bucket 2 #6 |
| C1 | function-owner row | pass | none |
| C2 | function overrides on capabilities | vacuous (no capabilities) | none |
| D1 | UI spot-check | deferred | none |
| E1-E5 | roles + bundling | vacuous (no modules; 2-module floor blocks role authoring) | folded into B1-S4 |
| F1 | legacy domain-level system skill | will become FAIL once modules ship; currently transitional | B1-S13 (blocked by B1-S4) |
| F2-F5 | module-anchored skills + Semantius score | uncomputable until M1 cured | folded into B1-S4 |
| H1 | APQC tags on cross-domain handoffs | pass (9/9 cross-domain handoffs carry `agent_curated` rows; 0 `record_status=approved` yet) | report-only quality headline |

### Bucket 1 (pending)

Carried forward from 2026-05-30 (none resolved this audit beyond the three closed in the 2026-05-31 continuation):

- B1-M1..M5 (compliance MISSING: assurance_engagements, double_materiality_assessments, esg_disclosure_taxonomies, regulatory_change_records, esg_audit_evidence)
- B1-U1..U4 (universal-vendor MISSING: scope3_categories, emission_calculation_runs, carbon_credit_purchases, renewable_energy_certificates)
- B1-S2 (capabilities + capability_domains; intersects Bucket 2 #1)
- B1-S3 (catalog_tagline / catalog_description; Rule #20 routing, requires user-approved wording)
- B1-S4 (modules: ESG-CARBON-ACCOUNTING / ESG-DISCLOSURE-REPORTING / ESG-PERFORMANCE-MGMT / ESG-SUPPLIER-SUSTAINABILITY; blocking gate; intersects Bucket 2 #4)
- B1-S5 (pattern flag positive review on 4 masters; intersects Bucket 2 #3)
- B1-S6 (8-10 intra-domain `data_object_relationships`)
- B1-S7 (7-9 users-edges per Rule #10)
- B1-S8 (7 missing cross-domain `data_object_relationships`)
- B1-S10 (B10b source-side PATCH; blocked by B1-S4)
- B1-S11 (aliases across 9 masters)
- B1-S12 (lifecycle states for 6 workflow-bearing masters; intersects Bucket 2 #6)
- B1-S13 (DELETE legacy `esg-system` skill id 13 once module-anchored system skills ship; blocked by B1-S4)
- B1-B1 (handoff 851 target re-routing; routes via Bucket 2 #5)

### Bucket 2 (pending, unchanged)

1. Capability-domain split: carbon accounting vs. ESG disclosure reporting as one capability or two.
2. `financial_plans` consumer link justification (keep + ask EPM for outbound, downgrade, or remove).
3. Pattern flag positive review on 4 masters (esg_disclosures, esg_targets, facility_emissions, assurance_engagements).
4. Modularization acceptance: 4-module shape vs. 3-module collapse vs. 5-module split (depends on Bucket 3 #5 / #6).
5. Handoff 851 target re-routing (FINOPS vs. EPM vs. delete; B1-S14 already provisionally tagged 851 -> 1802 in the prior continuation, so resolution may update that PCF row).
6. Config-shape exemption for `emission_factors` lifecycle.

### Bucket 3 (pending, unchanged)

B3-1 biodiversity_records; B3-2 water_usage_records; B3-3 waste_records; B3-4 stakeholder_engagement_records; B3-5 scope3_supplier_surveys (overlaps SUSTAIN-PROC candidate); B3-6 product_carbon_footprints (overlaps PROD-CARBON-FOOTPRINT candidate).

### Cross-bucket dependencies

- Bucket 2 #4 depends on Bucket 3 #5 + #6 (domain promotion decisions reshape ESG module set).
- Bucket 1 B1-M1..M5 are independent of Buckets 2 / 3.
- Bucket 2 #5 may re-tag B1-S14's existing 851 row.
- Bucket 2 #6 shapes B1-S12 scope but does not block the other 5 masters' lifecycle authoring.
- B1-S10 and B1-S13 are blocked behind B1-S4.

### JWT errors

None.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (SKILL.md Rule #21) against ESG's open state.yaml items. ESG remains
UNBUILT: live verification confirmed 0 `domain_modules` and 0 `capability_domains` rows (domain
id 21, parent GRC id 15). Per the unbuilt LEAVE rule, the build (B1A-BUILD) and its whole cascade
were surfaced, not scaffolded. Only build-independent additive/corrective items that operate on
the 9 existing masters were executed. No JWT errors. No destructive action taken. Re-run of the
loader confirmed full idempotency (0 rows on second pass).

Loader: [.tmp_deploy/2026-06-07_esg_state_driven_execute.ts](../../.tmp_deploy/2026-06-07_esg_state_driven_execute.ts). Run from project root.

### Executed (all record_status='new' or PATCH of empty/unclassified fields)

- **entity_type (Rule #12 / B13)**: PATCHed all 9 masters from `unclassified` to a typed enum,
  deterministic from each description: emissions_records=operational_record,
  emission_factors=catalog, activity_data_records=operational_record, esg_targets=operational_workflow,
  esg_metrics=computed, esg_disclosures=operational_workflow, supplier_esg_assessments=operational_workflow,
  facility_emissions=operational_workflow, esg_initiatives=operational_workflow. (9 PATCHes.)
- **Catalog UX (Rule #20)**: authored `catalog_tagline` + `catalog_description` on domain 21
  (both were empty). Buyer voice, workflow + value; statutory frameworks (CSRD, ISSB, GHG Protocol)
  named in-line per Rule #18; no vendor/product names; no em-dash; American English. (1 PATCH.)
  No module-level UX written (no modules exist).
- **B1A-S11 (B11 aliases)**: inserted 21 generic-synonym `data_object_aliases` rows across all 9
  masters (alias_type='synonym', is_preferred=false). No vendor product names; framework terms
  (GHG Records, CSRD Reports, Climate Disclosures, Net Zero Commitments) allowed. (21 INSERTs.)
- **B1A-S6 (B6 intra-domain relationships)**: inserted 8 `data_object_relationships` edges between
  ESG masters exactly per the S6 verbs: emission_factors applies_to emissions_records;
  activity_data_records sources emissions_records; facility_emissions rolls_up emissions_records
  (composition); esg_targets governs esg_metrics; esg_metrics summarizes emissions_records;
  esg_disclosures reports esg_metrics; esg_disclosures reports facility_emissions; esg_initiatives
  drives esg_targets. All one_to_many, owner_side=source. (8 INSERTs.) Pre-flight confirmed 0
  existing intra-ESG edges (the 4 pre-existing edges touching ESG masters are all cross-domain).

### Surfaced (no write; needs user decision or has a blocker)

- **All b2 (B2-1..B2-6)**: capability split (B2-1), financial_plans consumer link (B2-2), pattern
  flag review (B2-3), modularization shape (B2-4, the blocking build decision), handoff 851 target
  (B2-5), emission_factors lifecycle (B2-6, now largely resolved toward config-shape by the
  entity_type=catalog classification).
- **B1A-S8 (cross-domain relationships)**: NOT executed. Three named target endpoints do not exist
  in the catalog (`risk_registers`, `regulatory_policies`, `tprm_supplier_risk_records`) -> defer to
  Discover. Only `audit_engagements` (293) exists; the three AUDIT edges are authorable but left with
  the build/S7 modeling tier. The 851 edge is blocked on B2-5.
- **B1B-S13 (DESTRUCTIVE)**: any DELETE of legacy esg-system skill id 13 / its skill_tools needs
  approval and re-framing under the 2026-06-06 supersession (esg-system may BE the single domain-grain
  skill, not a relic; skill_tools is what retires).
- **B1B-B1 (DESTRUCTIVE)**: re-routing handoff 851 would overwrite/delete the non-empty
  handoff_processes row 674 (851->1802); needs approval and B2-5.
- **Personas / RACI (Phase P)**: deferred. ESG is unbuilt and single/multi-module shape is unknown,
  so no personas authored. Candidate personas at build time: Sustainability Manager, ESG Disclosure
  Lead, Carbon Accountant, Supplier Sustainability Analyst.

### Left (untouched)

- **B1A-S7 (users-edges, Rule #10)**: left with the build (modeling tier authored at build time
  alongside the Phase-B preview). users data_object resolved live as id 748 (platform_builtin).
- **B1A-M1..M5, B1A-U1..U4**: new entities routed to non-existent modules; part of the build, gated
  on B2-4 / B1B-S4.
- **B1B-S2 / S4 / S5 / S10 / S12**: blocked on B2 decisions and/or the build.
- **b3 backlog (B3-1..B3-6)**: speculative candidates, non-blocking.
- **Per-module skill-grain / skill_tools items**: RETIRED per the 2026-06-06 supersession header
  (kept atop state.yaml).
- **C1 (business_function_domains)**: already populated (owner 115 ESG and Sustainability, contributor
  116 Finance); nothing to do.
- **H1 (APQC handoff_processes)**: already fully tagged on all 9 ESG handoffs (closed 2026-05-31);
  nothing to do.
- **A3 (solution_domains)**: passes (7 solutions); SCOPE DISCIPLINE forbids new vendors/solutions.

### JWT errors

None.

## 2026-06-13 - B9d verify executed (B1A-B9D-VERIFY resolved)

NOTE ON THE PRIOR ENTRY: an earlier 2026-06-13 attempt appended a "BLOCKED on tenant misconfiguration" note here, concluding the environment was pointed at the wrong tenant. That conclusion was WRONG and the note has been replaced by this accurate record. The `adenin` org / `adenin.semantius.ai` baseurl IS correct and DOES carry the domain_map catalog: `getCurrentUser` shows module `Domain Map` (id 1001) with `domain_map:read` + `domain_map:manage`, and live reads of `/domains?id=eq.21` (ESG) and the ESG masters all succeeded. The `PGRST205 "could not find the table ... in the schema cache"` errors the prior attempt hit were a transient schema-cache drop, not a wrong-tenant condition; `semantius call crud refresh_schema_cache` clears them. No `.env` change was needed.

Ran the single open agent-executable item, B1A-B9D-VERIFY, via `bun run scripts/analytics/b9d_resolver.ts ESG` (dry-run then `--write`). Resolver output (both directions, all boundaries):

- boundary tags: 10 | distinct (process, owner) findings: 6 | verdicts: 1 ORPHAN, 5 UNOWNED.
- **ORPHAN -> REAL-EST (additively routed, owner-side carve-out (b)):** PCF `13.9.1.1` "Evaluate environmental impact of products, services, and operations" (pid 1783), carried by `utility_meter_readings` on the inbound handoff `293: REAL-EST -> ESG`. Owner is REAL-EST (it masters `utility_meter_readings`, data_object 350), currently unbuilt. The resolver wrote an additive `B2-B9D-OWN-1783` item into `audits/REAL-EST/state.yaml` and appended question q15 (token `B2-B9D-OWN-1783`) to `audits/REAL-EST/q-REAL-EST.md`. Additive only; no REAL-EST data overwritten, no `record_status` touched. REAL-EST already carried a prior B9d ORPHAN (q14 = B2-B9D-OWN-1412); the new one appended as q15.
- **5 UNOWNED (surfaced on ESG as sender; NOT a new gap):** PCF 167, 232, 815, 1802, 2016 carry ESG's own entities (`supplier_esg_assessments`, `emission_factors`, `emissions_records`, `esg_disclosures`, `esg_targets`, `activity_data_records`, `esg_initiatives`). These read as "no master row anywhere" ONLY because ESG is unbuilt (0 `domain_modules`, hence 0 `domain_module_data_objects`); the masters exist in legacy `domain_data_objects`, which the resolver does not read for ownership. All five resolve to RESOLVED/owned automatically once ESG is built (gated on the B2-4 module-shape decision in q-ESG.md). They are a symptom of the already-surfaced build blocker, not a separate agent-executable item, and are left for the build. No destructive re-point or mis-tag was proposed.

B1A-B9D-VERIFY is now resolved and removed from `state.yaml`. ESG's remaining open work (the whole build and its cascade: B1A-M1..M5, B1A-U1..U4, B1A-S7/S8/BUILD, all b1b, all b2, b3) is gated on the B2-4 module-shape user decision in the current `q-ESG.md`; nothing else is agent-executable. ESG goes to `next_action_by: user` (the build cannot proceed until B2-4 is answered). The `q-ESG.md` is current and unchanged.

### JWT errors

None.
