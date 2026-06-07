# PS-LIC audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 6 master `data_objects` (permit_applications, license_records, permit_inspections, license_renewals, code_violations, regulatory_fees); **0 `domain_modules`** (blocking M1); **0 `capability_domains` rows** (blocking A2); 5 solutions linked (Accela, OpenGov, Tyler ERP, ServiceNow PSDS primary, Salesforce PS secondary); 4 regulations (FedRAMP, CMMC, StateRAMP, Section 508); 1 `business_function_domains` owner (Business Operations); 8 trigger events on these masters; 6 outbound handoffs (CSM x2, GRC x2, ERP-FIN x2); 0 inbound handoffs; 22 `data_object_relationships` (intra-domain + users edges populated + 4 cross-domain edges); 11 aliases; 1 legacy domain-level system skill `ps-lic-system` (id 93, `domain_module_id=null`) with 8 `skill_tools` (7 platform-covered, 1 external `sign_document`); 0 lifecycle states on any of the 6 masters; pattern flags all false by default (never considered).
- **`domains` row metadata (A1):** `crud_percentage=95`, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `certification_required=true`, `usa_market_size_usd_m=1000`, `market_size_source_year=2025`, `business_logic=''` (acceptable at `crud_percentage>=95`), `catalog_tagline=''`, `catalog_description=''` (A4 fail), `notes=''`.
- **Vendor surface basis (market audit pass):** Accela Civic Platform (pure-play permitting / licensing leader, Accela Citizen Access front-end), OpenGov Permitting and Licensing (mid-market civic-tech entrant), Tyler Technologies EnerGov / Enterprise ERP (long-tail government suite), ServiceNow Public Sector Digital Services (workflow-platform entrant), CitizenServe (SMB / county-tier specialist). Regulated market: FedRAMP / StateRAMP for hosting, Section 508 for accessibility, ADA Title II for digital service delivery, NIST SP 800-53 controls for federal contractors.
- **Bucket 1 (in-scope, agent fixable):** 10 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 10 items.
- **Candidates queued to `audits/_missing-domains.md`:** 2 (PS-CONST-ENGAGE, PS-GRANTS-MGMT).
- **Status:** `feedback_needed`. The M-band gate (no modules, no capabilities) blocks every downstream Phase B / E / F fix. Cure M1 + A2 first; remaining items follow once the module shape lands.

Structural pass: **A partial fail** (A2 zero capabilities; A4 empty catalog UX fields). **M fail (blocking)** (M1 zero modules; M2 / M4 / M5 / M6 cascade). **B partial fail** (B4 pattern flags never re-evaluated; B9 three trigger events have no handoff; B10b every outbound handoff has NULL `source_domain_module_id`; B12 zero lifecycle states across all 6 masters). **C pass** (1 owner row, no diverging capability overrides needed yet). **D not run** (UI spot-check is a post-fix step). **E vacuous fail** (no modules to bundle roles against, no PS-LIC roles in catalog). **F transitional** (legacy domain-level skill exists, no module-level skills yet, F1 acceptable only until M1 cures, F2 will fail the moment modules land). **H fail** (1 of 6 cross-domain handoffs has an APQC tag, and the existing tag is wrong: `Plan and budget IT license usage volumes` (id 1290) refers to IT software licensing, not regulatory licensing).

### Pass 3, Neighbor discovery

Edge weights derived from `handoffs` + cross-domain `data_object_relationships` on PS-LIC masters.

| Neighbor | Outbound handoffs | Inbound handoffs | Cross-domain DOR edges | Edge weight | Pairwise pass? |
|---|---|---|---|---|---|
| CSM (30) | 2 (`permit_inspection.failed`, `license_renewal.due` to customer_cases) | 0 | 4 (permit_inspections, license_renewals, both directions via customer_cases) | 6 | yes |
| ERP-FIN (65) | 2 (`license.issued`, `regulatory_fee.assessed` to journal_entries) | 0 | 2 (regulatory_fees, license_records via journal_entries) | 4 | yes |
| GRC (15) | 2 (`code_violation.issued`, `permit_inspection.failed` to compliance_risks / obligations) | 0 | 2 (code_violations to compliance_risks; permit_inspections to compliance_obligations) | 4 | yes |

No other neighbors have any edge. Pairwise deep dive runs against all three since all are at weight >= 3.

### Bucket 1, In-scope confirmed gaps

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (deferred to Bucket 3; M-band must cure first) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 7 |
| BOUNDARY (NULL FK, missing handoff, stale APQC tag) | 2 |
| **APQC TAGGING** (per-handoff PCF activity classification) | 1 (covers all 6 cross-domain handoffs) |
| MODULARIZATION ISSUES | 0 (routes to Bucket 2; refactor conversation) |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1, M2, M4, M5, M6 | **BLOCKING.** Zero `domain_modules` rows for PS-LIC (`/domain_modules?domain_id=eq.46` empty). Domain is non-deployable as it stands; every B / E / F fix below cascades behind module-shape resolution. | Hand-author the module set (see Bucket 2 #1 for shape options). Recommended baseline split: `PS-LIC-APPLICATION-INTAKE` (permit_applications), `PS-LIC-ISSUANCE-AND-RENEWAL` (license_records, license_renewals), `PS-LIC-INSPECTION-AND-ENFORCEMENT` (permit_inspections, code_violations), `PS-LIC-FEES` (regulatory_fees). Three or four `module_kind='full'` rows, satisfies M2's >=2 floor. |
| B1-S2 | A2 | **BLOCKING.** Zero `capability_domains` rows (`/capability_domains?domain_id=eq.46` empty). Rule #14 requires >=3 capabilities for the >=2-module floor; with zero capabilities the module-vs-capability bipartite check (M4, M6) cannot pass. | Hand-author 5 to 8 capability_codes (see Bucket 2 #2 for shape options). Recommended capabilities: application intake, license issuance, regulatory inspection, code enforcement, renewal lifecycle, fee assessment, public-facing portal access, OFCCP / accessibility compliance reporting. |
| B1-S3 | F1, F2 (cascading) | Legacy domain-level system skill `ps-lic-system` (id 93, `domain_id=46`, `domain_module_id=null`) is the only skill row. Once modules land per B1-S1, F2 requires exactly one `skill_type='system'` skill per `domain_modules` row anchored via `domain_module_id`; the legacy row will fail F1's "no domain-level system skills remain once module-level skills exist" rule. | After M1 cures: split the existing 8-tool skill into N per-module skills (one per module from B1-S1), renamed `<module_code_lower>_agent` (e.g. `ps_lic_application_intake_agent`). Re-attach `skill_tools` rows per module. DELETE the legacy row (id 93) only once every module has its own system skill. |
| B1-S4 | A4 (Rule #20) | Both `domains.catalog_tagline` and `domains.catalog_description` are empty strings. Buyer-facing catalog has no copy for the PS-LIC card or detail page. | Draft both fields per Rule #20 voice rule (buyer voice, workflow + value), surface to user BEFORE writing. Sample tagline: "Process permit applications, issue licenses, schedule inspections, and bill regulatory fees in one civic-services workflow." |
| B1-S5 | B12 (Rule #12) | Zero `data_object_lifecycle_states` rows for any of the 6 masters. Every published-verb trigger event (`permit_application.approved`, `license.issued`, `license_renewal.due`, `permit_inspection.failed`, `code_violation.issued`, `regulatory_fee.assessed`) implies a workflow gate the catalog is not yet expressing, so no module-prefixed `<module>:<verb>_<entity>` permissions can be derived. | Author lifecycle states per master after M1 cures. Suggested initial-and-published-state pairs: permit_applications (`submitted` initial, `approved` / `denied` / `withdrawn` terminal); license_records (`issued` initial, `active` / `suspended` / `revoked` / `expired`); permit_inspections (`scheduled` initial, `passed` / `failed` terminal); license_renewals (`due` initial, `applied` / `renewed` / `lapsed` terminal); code_violations (`issued` initial, `contested` / `paid` / `dismissed` terminal); regulatory_fees (`assessed` initial, `invoiced` / `paid` / `waived` / `written_off` terminal). Set `requires_permission=true` on every state that gates a workflow transition. |
| B1-S6 | B4 (Rule #12) | All three pattern flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) are `false` on every PS-LIC master, never positively re-evaluated. `permit_applications` carries applicant PII (name, address, business identity), `license_records` carries licensee PII, `code_violations` carries personally identifying details of the cited party. `has_submit_lock` plausibly applies to permit_applications once submitted (constituent cannot edit after intake) and to license_renewals once filed. `has_single_approver` may apply to permit_applications (single regulating authority issues approval). | PATCH the flags row-by-row per the audit decision (see Bucket 2 #3 for the per-flag judgment). |
| B1-S7 | B10b | All 6 outbound handoffs (ids 921, 922, 923, 924, 925, 926) have `source_domain_module_id IS NULL` because PS-LIC has no modules. Two of the six also have `target_domain_module_id IS NULL` (`permit_inspection.failed` to CSM and `license_renewal.due` to CSM should resolve to `CSM-CASE-MGMT` (id 112) since CSM masters customer_cases there). | After M1 cures, derive `source_domain_module_id` from the module that masters the event's `data_object_id` and PATCH all 6 rows. For target side: PATCH handoffs 923 and 924 to `target_domain_module_id=112` (`CSM-CASE-MGMT`) now (CSM is modularized). Handoffs 921, 922, 925, 926 target GRC and ERP-FIN, which have zero modules: those `target_domain_module_id` PATCHes block on GRC's M1 and ERP-FIN's M1 (route to Report-only). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | Three trigger events with zero `handoffs` rows: `permit_application.submitted` (1052), `permit_application.approved` (1053), `permit_inspection.scheduled` (1056). All three are valid published verbs that should have at least one cross-domain subscriber (CSM constituent acknowledgement, ERP-FIN fee assessment intake, calendaring / dispatch via FSM or CCAAS). | Draft handoff rows per B9 procedure. Minimal set: `permit_application.submitted` to CSM (acknowledgement case) and ERP-FIN (fee intake); `permit_application.approved` to CSM (approval notification); `permit_inspection.scheduled` to FSM (inspector dispatch, if FSM modeled; otherwise CSM scheduling case). Defer until M-band cures so per-module FKs are populatable at write time. |
| B1-B2 | Existing `handoff_processes` row on handoff 925 (`license.issued` to ERP-FIN, journal_entries posting) points at PCF id 1290 (`Plan and budget IT license usage volumes`, external_id 20893). The PCF activity is from the IT-software-license domain (an IT planning activity), not the regulatory licensing domain. Source: `discovery_substring` from a generic license-keyword substring match. `record_status='new'`. | DELETE the row, replace with `proposal_source='agent_curated'` row pointing at PCF id 303 (`Process accounts receivable (AR)`, L3, external_id 10744) or PCF id 1353 (`Post receivable entries`, L4, external_id 10797). The handoff is fundamentally an AR posting motion. See B1-H1 below for the full per-handoff classification table. |

#### B9b. Intra-domain cross-module handoffs

**Pre-check skip:** B9b is non-skippable on any domain with >=2 modules. PS-LIC has 0 modules (M1 blocking, B1-S1), so the cross-module surface does not yet exist. Once B1-S1 lands per the recommended split (4 modules), the intra-domain lifecycle progressions become first-class rows: permit_applications.approved (PS-LIC-APPLICATION-INTAKE source) to license_records (PS-LIC-ISSUANCE-AND-RENEWAL target); license_records.issued (PS-LIC-ISSUANCE-AND-RENEWAL source) to regulatory_fees (PS-LIC-FEES target); permit_inspections.failed (PS-LIC-INSPECTION-AND-ENFORCEMENT source) to code_violations (same module, intra-module) and to permit_inspections (reinspection cycle, same module); license_renewals.due (PS-LIC-ISSUANCE-AND-RENEWAL source) to regulatory_fees (PS-LIC-FEES target); code_violations.issued (PS-LIC-INSPECTION-AND-ENFORCEMENT source) to regulatory_fees (PS-LIC-FEES target). Five candidate intra-domain handoffs. Defer until after B1-S1 lands. Listed here to make sure the gap is captured.

#### APQC TAGGING

| ID | Finding | Fix |
|---|---|---|
| B1-H1 | 6 cross-domain handoffs published by PS-LIC; 1 currently tagged (incorrectly per B1-B2), 5 untagged. H1 fails. The analyst's mental model is open from the structural pass, so the agent proposes the PCF classification table now. | INSERT into `handoff_processes` per the table below, `proposal_source='agent_curated'`, `record_status='new'`. Plus DELETE the wrong existing row on handoff 925 (id 1290) per B1-B2 before inserting the proposed replacement. |

Per-handoff classification:

| handoff_id | source → target | trigger_event | payload | Proposed PCF process | PCF id | external_id | confidence |
|---|---|---|---|---|---|---|---|
| 921 | PS-LIC → ERP-FIN | `regulatory_fee.assessed` | regulatory_fees | Process accounts receivable (AR) | 303 | 10744 | confident L3 |
| 922 | PS-LIC → GRC | `code_violation.issued` | code_violations | Manage regulatory compliance | 369 | 16463 | confident L3 |
| 923 | PS-LIC → CSM | `permit_inspection.failed` | permit_inspections | Resolve customer billing inquiries (proxy: customer-case opening for a failed inspection notice; PCF lacks a "constituent case" activity) | 1354 | 10798 | medium L4, candidate for Discover Pass 3 custom process |
| 924 | PS-LIC → CSM | `license_renewal.due` | license_renewals | Generate customer billing data (proxy: renewal-due customer outreach; PCF lacks a "renewal calendaring" activity) | 1351 | 10795 | medium L4, candidate for Discover Pass 3 custom process |
| 925 | PS-LIC → ERP-FIN | `license.issued` | license_records | Post receivable entries (revenue / AR posting for the issuance fee) | 1353 | 10797 | confident L4 (parent PCF 303 also acceptable) |
| 926 | PS-LIC → GRC | `permit_inspection.failed` | permit_inspections | Manage regulatory compliance | 369 | 16463 | confident L3 |

Deferred-to-Discover candidates (medium confidence flagged inline above): handoffs 923 and 924. PCF cross-industry framework lacks government-shaped "constituent case" or "renewal calendaring" activities; proposed PCF is the closest commercial-customer analogue. Discover Pass 3 may author a custom-process row instead.

Volume: 6 cross-domain handoffs; agent proposes 6 new `agent_curated` rows (4 confident, 2 medium) plus 1 DELETE on the wrong existing row. Falls within the 0.5N to 0.8N target expectation (N=6).

### Bucket 2, Surface-for-user (judgment calls)

1. **Modularization shape.** Zero modules today (B1-S1). The recommended baseline is a 4-module split aligned to the lifecycle phases: `PS-LIC-APPLICATION-INTAKE` (permit_applications), `PS-LIC-ISSUANCE-AND-RENEWAL` (license_records + license_renewals), `PS-LIC-INSPECTION-AND-ENFORCEMENT` (permit_inspections + code_violations), `PS-LIC-FEES` (regulatory_fees). Alternatives: (a) 2-module collapse (`PS-LIC-APPLICATIONS-AND-LICENSING` carrying applications + licenses + renewals, `PS-LIC-FIELD-OPS` carrying inspections + violations + fees), (b) 3-module split (`PS-LIC-INTAKE`, `PS-LIC-COMPLIANCE`, `PS-LIC-BILLING`), (c) single full module `PS-LIC-CORE` plus a `module_kind='starter'` lite variant for the SMB / county-tier deployment. Independent of Bucket 3 (the 4-module shape covers the current 6 masters cleanly even if Bucket 3 adds another 4 to 6 entities). Dependency: Bucket 1 entirely blocks on this answer.
2. **Capability set.** Zero capabilities today (B1-S2). Recommended 8-capability shape: application intake, license issuance, inspection scheduling and dispatch, code-enforcement workflow, license renewal lifecycle, regulatory fee assessment, constituent-facing portal access, accessibility-and-OFCCP compliance reporting. The choice interacts with Bucket 2 #1 (which capability realizes in which module via `domain_module_capabilities`). Alternatives: 5-capability narrow shape (intake, issuance, inspection, renewal, fees) or 10-capability broad shape (add hearings / appeals, public-records access, GIS-parcel integration). Independent of Bucket 3.
3. **Pattern flag judgment per master.** Recommended PATCHes after user approval: `permit_applications.has_personal_content=true` (applicant PII), `permit_applications.has_submit_lock=true` (post-submit immutability), `license_records.has_personal_content=true` (licensee PII), `license_renewals.has_personal_content=true` (renewing licensee), `code_violations.has_personal_content=true` (cited-party PII), `code_violations.has_single_approver` is debatable (single hearing officer vs panel; jurisdiction-dependent). All other defaults likely stay false. Independent of Bucket 3.
4. **FedRAMP / CMMC / StateRAMP scoping.** Catalog has 4 mandatory regulations (FedRAMP, CMMC, StateRAMP, Section 508). FedRAMP applies only to cloud-hosted federal-facing systems; CMMC applies only to federal contractors handling CUI; StateRAMP is voluntary state-level adoption. **Is the mandatory-for-all-PS-LIC scoping intentional, or should each be `optional` with a per-deployment qualifier?** Options: (a) keep all four mandatory (most PS-LIC tenants are public-sector hosted cloud, so this is the realistic deployment shape), (b) demote FedRAMP and CMMC to `optional` (only federal contractor jurisdictions), (c) add ADA Title II as missing mandatory. Missing from list: NIST SP 800-53, IRS Pub 1075 (for state-revenue-touching license types), HIPAA (where regulated occupations involve PHI, e.g. ambulance permits or food-handler licenses linked to health departments). Independent of Bucket 3.
5. **Wrong existing APQC tag handling (handoff 925).** Existing row points at PCF 1290 (IT software licensing). Options: (a) DELETE then INSERT replacement per B1-B2 / B1-H1 (recommended), (b) PATCH `record_status='rejected'` so the audit trail keeps the bad row visible, (c) leave for the Discover Pass 3 reviewer to triage. The agent recommends (a) but flags this as a Rule #1 decision (any `record_status` other than `new` requires explicit user approval). Independent of Bucket 3.
6. **Cost band, market size review.** `cost_band='$$$'` (annual TCO $100k to $500k for 500-user org) and `usa_market_size_usd_m=1000` ($1B TAM) anchored to 2025. Public-sector permitting TAM is volatile (post-ARPA federal funding inflated 2022 to 2024 spending; 2025 forecast is contraction). The $1B figure appears low if the right comparator is "all civic permitting + licensing software"; appears reasonable if scoped to "pure-play permitting platforms only". Confirm scope and refresh source.

### Bucket 3, Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced by market reasoning (Accela, OpenGov, Tyler EnerGov, ServiceNow PSDS, CitizenServe). Phase 0 vetting (formal vendor-research protocol per `references/vendor-research-protocol.md`) would confirm or filter.

| ID | Candidate | Proposed module | Vendor evidence basis | Reason |
|---|---|---|---|---|
| B3-1 | `permit_types` | PS-LIC-APPLICATION-INTAKE | Universal (Accela, OpenGov, Tyler, ServiceNow PSDS): config catalog of allowable permit types with per-type fees, required documents, routing rules. | Permit applications are typed; the typed-config is the master that drives intake-form generation, fee calculation, and inspection requirements. |
| B3-2 | `license_types` | PS-LIC-ISSUANCE-AND-RENEWAL | Universal: licensing taxonomy (occupational, business, professional, vehicle, environmental) with per-type renewal cadence and CE requirements. | Issued license records are typed; license type drives renewal schedule and reciprocity rules. |
| B3-3 | `inspection_checklists` | PS-LIC-INSPECTION-AND-ENFORCEMENT | Universal (Accela, Tyler, OpenGov inspections module): checklist templates per permit type or code section. | Inspections execute against a typed checklist; pass / fail is per checklist item, not a single inspection-level boolean. |
| B3-4 | `regulatory_codes` | PS-LIC-INSPECTION-AND-ENFORCEMENT | Common (Accela code-enforcement, Tyler EnerGov code mgmt): codified municipal / state code references that violations cite. | Code violations cite a specific code section; the codified rules are the master that the violation references. |
| B3-5 | `payment_records` | PS-LIC-FEES | Common: payment transactions against assessed fees. Currently `regulatory_fees` only captures the assessed liability, not the payment event. | Without `payment_records` the AR loop is incomplete: the catalog cannot represent partial payments, refunds, write-offs as first-class events. |
| B3-6 | `appeals` | PS-LIC-INSPECTION-AND-ENFORCEMENT | Common (Accela hearings module, Tyler hearings): formal appeal workflow against denied permits, contested violations, license revocations. | Due-process requirement for any regulatory enforcement action; ADA Title II compliance often gates on appeal access. |
| B3-7 | `permit_extensions` | PS-LIC-ISSUANCE-AND-RENEWAL | Common: time extensions on permits (construction delays, weather, etc.) with audit trail. | Permits have effective windows; extension is a typed amendment to the original permit, not a renewal. |
| B3-8 | `attached_documents` | PS-LIC-APPLICATION-INTAKE | Universal: any of plans, surveys, insurance certificates, business filings, identification copies attached to applications. | Document attachment is the workflow gate for most permit types; without a master the catalog cannot express the typed-attachment-required check at intake. |
| B3-9 | `business_addresses` and / or `parcels` | PS-LIC-APPLICATION-INTAKE (embedded master against a master in a GIS / location domain) | Universal: every permit and license is anchored to a property parcel or business address. | Cross-domain dependency on a parcel / address master that does not yet exist in the catalog (no PS-GIS domain present). Could resolve via the broader `locations` master if extended, or surface a new domain. |
| B3-10 | Modularization candidates from vendor surface (Accela, OpenGov, Tyler EnerGov, ServiceNow PSDS) | n / a | Phase 0 vendor surface pass deferred until B1-S1 cures. The B3-1 through B3-9 entity list is preliminary; flagship-vendor schemas would refine the surface. | Run Phase 0 against this domain (no formal Phase 0 has been done) once the user picks the modularization shape from Bucket 2 #1. |

### Cross-bucket dependencies

- **Bucket 1 entirely blocks on Bucket 2 #1 (modularization shape).** No fix in Bucket 1 can land until the user picks how many modules to create (and what their codes are). B1-S1 directly is the M1 cure; B1-S3 / S5 / S7 / B1 / H1 all reference module codes that do not exist yet.
- **Bucket 1 B1-S2 (capabilities) blocks on Bucket 2 #2 (capability set choice).** Same dependency shape.
- **Bucket 3 entity gaps mostly slot into modules from Bucket 2 #1's answer.** If the user picks the 4-module recommended shape, the B3-1 through B3-9 entities map cleanly per the table above. If the user picks the 2-module collapse, several entities collapse into a single module and the user might choose to defer or rename.
- **Bucket 2 #4 (regulation scoping) may surface additional Bucket 3 entities** (e.g. NIST SP 800-53 control assessments, IRS Pub 1075 attestations). If the user wants those mandatory, they become missing entities not in the current list.
- **Buckets 2 and 3 are otherwise independent of each other.** The user can resolve Bucket 2 pattern flags (#3), regulation scoping (#4), wrong-tag handling (#5), and cost / market review (#6) in any order without waiting on Bucket 3.

### Per-bucket prompts

- **After Bucket 1:** "Bucket 1 holds 10 items. Items B1-S1 and B1-S2 are blocking (no modules, no capabilities). Once you confirm the module shape (Bucket 2 #1) and capability set (Bucket 2 #2), the rest cascade. Should I prepare a single loader that lands modules + capabilities + capability_domains + domain_module_capabilities + (re-anchored) skills + skill_tools as one Phase A, then a separate Phase B loader for lifecycle states (B1-S5) + pattern flag PATCHes (B1-S6) + handoff per-module FK PATCHes (B1-S7) + missing trigger-event handoffs (B1-B1) + APQC TAGGING fixes (B1-H1, including the DELETE on handoff 925 per B1-B2)? Or split further? Or hold the whole Bucket 1 until Phase 0 (Bucket 3) lands first?"
- **After Bucket 2:** "Bucket 2 holds 6 items. Items 1 and 2 (modularization, capabilities) gate all of Bucket 1; please pick a shape for each, or ask for a deeper breakdown. Items 3 (pattern flags), 4 (regulation scoping), 5 (wrong-tag handling), 6 (cost / market review) are each independent. What's your call on each? I'll wait for your decision per item before acting."
- **After Bucket 3:** "Bucket 3 holds 10 items. The 9 entity candidates (B3-1 through B3-9) are unverified against flagship vendors (no formal Phase 0 run for this domain). Options: (a) vetted route, I run focused Phase 0 vendor research on PS-LIC, produce a confirmed gap list, survivors become Bucket 1 items in a follow-up audit pass; (b) eyeball route, you name which candidates ring true; named candidates become Bucket 1 items immediately. B3-10 (modularization candidates from vendor surface) folds into option (a). Which route?"

### Report-only follow-ups (owed by other domains)

These items are not in PS-LIC's fix scope. They route to other domains' audits.

| Source / target domain | Owed check | Detail |
|---|---|---|
| GRC (id 15) | M1 | GRC has zero `domain_modules` rows. Two PS-LIC outbound handoffs target GRC (handoffs 922, 926). Their `target_domain_module_id` cannot be derived until GRC modularizes. Cross-domain `data_object_relationships` 682 (`code_violations` feeds `compliance_risks`) and 683 (`permit_inspections` feeds `compliance_obligations`) also depend on GRC's module shape for per-module FK attribution. |
| ERP-FIN (id 65) | M1 | ERP-FIN has zero `domain_modules` rows. Two PS-LIC outbound handoffs target ERP-FIN (handoffs 921, 925). Their `target_domain_module_id` blocks on ERP-FIN modularization. Cross-domain `data_object_relationships` 686 (`regulatory_fees` posts_to `journal_entries`) and 687 (`license_records` posts_to `journal_entries`) also depend on ERP-FIN's module shape. |
| CSM (id 30) | B10b | CSM has 3 modules; the inbound side of PS-LIC handoffs 923 and 924 should resolve to `target_domain_module_id=112` (`CSM-CASE-MGMT`, which masters `customer_cases`). The PATCH lives on the PS-LIC side (B1-S7 above) since PS-LIC owns the row, but the deterministic answer is CSM-side knowledge. CSM B10b also owes inbound coverage on PS-LIC handoffs (record the inbound handoff from PS-LIC into its `CSM-CASE-MGMT` module's reference set during CSM's next audit). |
| GRC, ERP-FIN | B8 outbound to PS-LIC | These domains may publish events that PS-LIC consumes (e.g. ERP-FIN published payment-receipt event that updates PS-LIC `regulatory_fees.paid`; GRC published policy-update event that obsoletes a `code_violations` cause). Currently zero inbound handoffs to PS-LIC. Discover during those domains' B8 passes. |
| All neighbors | Pairwise reconciliation | Once PS-LIC modularizes per B1-S1, deferred pairwise diff against CSM (weight 6), ERP-FIN (weight 4), GRC (weight 4) for sections 1 to 5 of the four-leg analysis. Each will surface 1 to 3 missing handoff candidates plus the cross-domain DOR mirror checks. |

### Candidates queued to `audits/_missing-domains.md`

Per pass-2 market audit findings, two adjacent public-sector markets surfaced as potentially-missing domains. Both queued via `scripts/analytics/append_missing_domain.ts`:

| Code | Name | Evidence vendors | Adjacency | Rationale |
|---|---|---|---|---|
| PS-CONST-ENGAGE | Public-Sector Constituent Engagement (311) | Granicus, GovQA, SeeClickFix (CivicPlus), Accela Civic Engage | PS-LIC, CSM, CCAAS | 311 case intake, service-request routing, public-meeting agendas, FOIA workflow, constituent identity verification. Distinct point-solution market with 4+ pure-play vendors. Overlaps CSM (constituent cases) but anchored by public-sector identity / public-records distinctions CSM does not cover. |
| PS-GRANTS-MGMT | Public-Sector Grants Management | Submittable, Fluxx, eCivis (Euna), SmartSimple, GrantHub | PS-LIC, ERP-FIN, GRC | Grant solicitation, application intake, reviewer scoring, award disbursement, recipient compliance reporting, federal grant pass-through. Pure-play vendor market with 5+ specialists, distinct from PS-LIC (grants are funded inflows; licenses are regulatory outflows). |

These are queue entries only; the audit did not load any `domains` rows.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of Bucket 1 that does not require user judgment, deferred everything gated on M-band cure or user input.

### Applied (3 writes, loader [.tmp_deploy/fix_ps_lic_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_ps_lic_b1_technical_2026_05_31.ts))

- **B1-S7 (partial):** PATCH `handoffs.target_domain_module_id = 112` (CSM-CASE-MGMT) on handoffs 923 (`permit_inspection.failed` -> CSM) and 924 (`license_renewal.due` -> CSM). Both rows previously NULL; CSM is modularized so target FKs are derivable now. Source FKs and handoffs 921, 922, 925, 926 target FKs remain NULL (block on GRC and ERP-FIN M1, see Report-only follow-ups).
- **B1-B2:** DELETE `handoff_processes` id 142 (handoff 925, PCF 1290 "Plan and budget IT license usage volumes", `proposal_source='discovery_substring'`). PCF activity was from the IT-software-license domain, not regulatory licensing.
- **B1-H1:** INSERT 6 `handoff_processes` rows, `proposal_source='agent_curated'`, `record_status='new'`, per the per-handoff classification table in Pass 1: handoff 921 -> PCF 303, 922 -> PCF 369, 923 -> PCF 1354, 924 -> PCF 1351, 925 -> PCF 1353, 926 -> PCF 369. All PCF ids verified against live `/processes` before insert.

### Deferred (7 items, judgment or gated)

- **B1-S1** (modules): Bucket 2 #1 user pick. Blocks every M-band-gated downstream fix.
- **B1-S2** (capabilities): Bucket 2 #2 user pick.
- **B1-S3** (skill split): gated on B1-S1.
- **B1-S4** (catalog_tagline/description): Rule #20 requires user-approved draft before write.
- **B1-S5** (lifecycle states): gated on B1-S1 (module-prefixed permission derivation needs modules).
- **B1-S6** (pattern flag flips): Bucket 2 #3 user judgment per master.
- **B1-S7 (residual):** source FKs on all 6 handoffs and target FKs on handoffs 921, 922, 925, 926 block on PS-LIC M1, GRC M1, ERP-FIN M1.
- **B1-B1** (3 missing trigger-event handoffs): explicitly deferred in audit until M-band cures so per-module FKs are populatable at write time.

No JWT errors. No `notes` writes (Rule #15: pre-checked PS-LIC handoffs and the 6 masters for pollution, all `notes` already empty, no audit pre-specified row IDs to revert). Frontmatter untouched.

## 2026-05-31, Audit

### Summary

- **Current footprint:** 6 master `data_objects` (permit_applications, license_records, permit_inspections, license_renewals, code_violations, regulatory_fees); **0 `domain_modules`** (still blocking M1); **0 `capability_domains` rows** (still blocking A2); 5 solutions linked (Accela, OpenGov, Tyler Enterprise ERP, ServiceNow PSDS primary, Salesforce PS secondary); 4 regulations all `mandatory` (FedRAMP, CMMC, StateRAMP, Section 508); 1 `business_function_domains` owner (Business Operations, id 34); 8 trigger events; 6 outbound handoffs (2 to CSM, 2 to ERP-FIN, 2 to GRC); 0 inbound handoffs; 8 intra-domain `data_object_relationships` edges + 7 `users` reverse-direction edges across all 6 masters; 11 aliases across 5 masters; 1 legacy domain-level system skill `ps-lic-system` (id 93, `domain_module_id=null`) with 8 `skill_tools` (7 platform-covered, 1 external `sign_document`); 0 lifecycle states on any master; pattern flags all false on every master; 6 of 6 outbound cross-domain handoffs are APQC-tagged (`agent_curated`, `record_status='new'`).
- **`domains` row metadata (A1):** unchanged from prior audit. `crud_percentage=95`, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `certification_required=true`, `usa_market_size_usd_m=1000`, `market_size_source_year=2025`, `business_logic=''` (acceptable at `crud_percentage>=95`), `catalog_tagline=''`, `catalog_description=''` (A4 fail), `notes=''`.
- **Bucket 1 (b1a, agent-solvable):** 0 items. Every technical fix the prior audit identified as agent-applicable has landed (per 2026-05-31 Continuation); residual technical surfaces all gate on M1 or A2.
- **Bucket 1 blocked (b1b):** 5 items. PS-LIC M1 self-block, B12 lifecycle states (gate on M1), B10b residual handoff FKs (PS-LIC M1 + GRC M1 + ERP-FIN M1), B9 missing-handoff drafts (gate on M1), F2 module-level skills (gate on M1).
- **Bucket 2 (user-judgment):** 6 items, unchanged from prior audit. Items 1, 2 (module shape, capability set) blocking gates; items 3, 4, 5, 6 (pattern flags, regulation scoping, catalog UX wording, cost band review) independent.
- **Bucket 3 (Phase 0 pending):** 10 items, unchanged from prior audit (B3-1 through B3-10).
- **Status:** `feedback_needed`. The M-band gate remains the bottleneck. Until the user picks the module shape (b2 #1) and capability set (b2 #2), every blocked b1b item stays parked. No JWT errors during this audit.

### Structural pass results

| Band | Result | Notes |
|---|---|---|
| A1 | pass | All 7 business-metadata fields populated; `business_logic` empty acceptable at `crud_percentage=95`. |
| A2 | **BLOCKING fail** | Zero `capability_domains` rows. |
| A3 | pass | 5 solutions linked; 4 `primary`, 1 `secondary`. |
| A4 | fail | `catalog_tagline` and `catalog_description` both empty. |
| M1 | **BLOCKING fail** | Zero `domain_modules` rows (primary + host-junction both empty). Cascades to M2/M4/M5/M6/M7/M8 (all vacuous fails). |
| M2 | vacuous fail | Capability count = 0; cannot satisfy >=2 modules until A2 and M1 cure. |
| M4 | vacuous fail | No capabilities to realize. |
| M5 | vacuous fail | No lifecycle states authored (B12 fail); no modules to anchor. |
| M6 | vacuous fail | No modules to realize capabilities. |
| M7 | n/a | No `master` row collisions detected (single canonical master per data_object across the catalog for the 6 PS-LIC masters). |
| M8 | vacuous fail | No modules to host taglines or descriptions. |
| B5 | vacuous pass | Zero `embedded_master` rows on PS-LIC. |
| B7 | pass | 7 `users -> master` edges populated, covering all 6 masters (assigned applications, submitted applications, owns license, processes renewals, assigned inspections, issued violations, assessed fees). No forward `master -> users` edges, but the reverse-direction set is structurally complete. |
| B9 | partial fail | 8 trigger events on PS-LIC masters; 5 have at least one `handoffs` row, 3 have zero (`permit_application.submitted` id 1052, `permit_application.approved` id 1053, `permit_inspection.scheduled` id 1056). |
| B9b | skip | Pre-check: `domain_modules` count = 0, no cross-module surface to model. Re-runs when M1 cures. |
| B10b | partial fail | All 6 outbound handoffs have `source_domain_module_id IS NULL` (PS-LIC M1 self-block). 4 of 6 also have `target_domain_module_id IS NULL` (handoffs 921, 925 to ERP-FIN; handoffs 922, 926 to GRC; both target domains have M1 self-blocks). Handoffs 923 and 924 now resolve `target_domain_module_id=112` (CSM-CASE-MGMT) per the 2026-05-31 Continuation. |
| B11 | pass | 11 alias rows across 5 of 6 masters; `permit_applications`, `license_records`, `permit_inspections`, `code_violations`, `regulatory_fees`, `license_renewals` each have at least one synonym. |
| B12 | **BLOCKING fail** | Zero `data_object_lifecycle_states` rows for any of the 6 masters. Every master has at least one published-verb trigger event implying a workflow gate; lifecycle states are unauthored across the board. |
| C1 | pass | 1 owner row (Business Operations, id 34). |
| D | not run | UI spot-check is a post-fix step. |
| E1 | vacuous fail | 0 PS-LIC-specific roles in catalog; 0 modules; the single-module vacuous-pass clause does not apply since the domain has zero modules (not exactly 1). Cannot author multi-module roles until M2 cures. |
| E2 | n/a | No PS-LIC roles to audit. |
| E3 | n/a | No `role_modules` rows touch PS-LIC modules. |
| E4 | n/a | No PS-LIC roles to bundle permissions for. |
| E5 | n/a | No PS-LIC roles to path-check. |
| F1 | transitional pass | Legacy `ps-lic-system` (id 93, `domain_module_id=null`) exists. Pass acceptable ONLY while zero module-level system skills exist for the domain; will flip to fail the moment M1 cures and the first module-level system skill is authored. |
| F2 | vacuous fail | 0 modules so 0 module-level system skills can be authored. Rule #17 cannot land until M1 cures. |
| F3 | pass (on legacy) | The legacy skill 93 has 8 `skill_tools` rows. |
| F4 | pass | All 8 tools linked to skill 93 satisfy the `operation_kind` invariant: 6 `query` ops with `data_object_id` set (641-646), 2 `side_effect` ops (`send_email`, `sign_document`) with `data_object_id=null`. |
| F5 | uncomputable | No module-level system skills exist so per-module Semantius scores cannot be derived. F5 cures automatically once F2 cures. |
| H1 | coverage pass | All 6 outbound cross-domain handoffs carry a `handoff_processes` row; 0 inbound handoffs. Provenance: 6 of 6 `agent_curated`; coverage (catalog quality): 0 `approved` (no reviewer signed off yet). Process target met (~1.0N agent_curated against N=6, within the 0.5N to 0.8N+0.2N-deferred band, on the upper end since all 6 landed via the 2026-05-31 Continuation). |

### Bucket 1, In-scope confirmed gaps

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (deferred to Bucket 3) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 0 b1a, 5 b1b (all gate on M1) |
| BOUNDARY | 0 b1a, 1 b1b (B9 three missing-handoff drafts gate on M1 per-module FK derivation) |
| APQC TAGGING | 0 (all 6 outbound handoffs tagged in 2026-05-31 Continuation) |
| MODULARIZATION ISSUES | 0 (routes to Bucket 2 #1) |

No b1a items remain after the 2026-05-31 Continuation. Every residual technical surface is parked in b1b behind PS-LIC M1, GRC M1, or ERP-FIN M1, or behind a Bucket 2 user pick.

### Bucket 2, Surface-for-user (judgment calls)

Carried forward from 2026-05-30 audit, unchanged. The user has not yet decided any of these:

1. **Modularization shape (M1 cure).** Recommended baseline: 4-module split aligned to lifecycle phases (PS-LIC-APPLICATION-INTAKE, PS-LIC-ISSUANCE-AND-RENEWAL, PS-LIC-INSPECTION-AND-ENFORCEMENT, PS-LIC-FEES). Alternatives: 2-module collapse, 3-module split, single-module + starter.
2. **Capability set (A2 cure).** Recommended 8-capability shape. Alternatives: 5-capability narrow, 10-capability broad.
3. **Pattern flag judgment per master (B4).** Recommended: `permit_applications.has_personal_content=true` + `has_submit_lock=true`; `license_records.has_personal_content=true`; `license_renewals.has_personal_content=true`; `code_violations.has_personal_content=true`; `code_violations.has_single_approver` debatable.
4. **FedRAMP / CMMC / StateRAMP / Section 508 scoping.** All four currently `mandatory`. Confirm whether the mandatory-for-all-PS-LIC scoping is intentional or some should demote to `optional`. Missing candidates: ADA Title II, NIST SP 800-53, IRS Pub 1075, HIPAA (occupation-specific).
5. **Catalog UX wording (A4, Rule #20).** Both `domains.catalog_tagline` and `domains.catalog_description` are empty. Rule #20 requires user-approved wording before write. Sample tagline ready to surface.
6. **Cost band, market size review.** `$$$` and $1B TAM anchored to 2025. Confirm scope and refresh source.

### Bucket 3, Phase 0 pending (speculative)

Carried forward from 2026-05-30 audit, unchanged. 10 items: B3-1 `permit_types`, B3-2 `license_types`, B3-3 `inspection_checklists`, B3-4 `regulatory_codes`, B3-5 `payment_records`, B3-6 `appeals`, B3-7 `permit_extensions`, B3-8 `attached_documents`, B3-9 `business_addresses` / `parcels`, B3-10 vendor-surface modularization candidates.

### Report-only follow-ups (owed by other domains)

Carried forward from 2026-05-30, unchanged shape:

- **GRC (id 15) M1.** Two PS-LIC outbound handoffs (922 `code_violation.issued`, 926 `permit_inspection.failed`) target GRC. Their `target_domain_module_id` PATCH gates on GRC modularization.
- **ERP-FIN (id 65) M1.** Two PS-LIC outbound handoffs (921 `regulatory_fee.assessed`, 925 `license.issued`) target ERP-FIN. Their `target_domain_module_id` PATCH gates on ERP-FIN modularization.
- **GRC, ERP-FIN B8.** Potential inbound handoffs PS-LIC may consume (ERP-FIN payment-receipt -> regulatory_fee.paid; GRC policy-update -> code_violation invalidation). Surface during those domains' B8 passes.
- **CSM (id 30) B10b inbound.** Once CSM next audits, record the inbound coverage on handoffs 923 and 924 within `CSM-CASE-MGMT` (id 112) reference set.
- **All neighbors pairwise reconciliation.** Once PS-LIC modularizes, run pairwise diff against CSM (weight 6), ERP-FIN (weight 4), GRC (weight 4).

### Per-bucket prompts

- **After Bucket 1:** No agent-solvable items remain. Awaiting Bucket 2 decisions to unblock the b1b queue.
- **After Bucket 2:** Items 1 and 2 (modularization, capabilities) gate the entire b1b queue; please pick a shape for each. Items 3, 4, 5, 6 are independent.
- **After Bucket 3:** 10 candidates remain unverified. Vet via Phase 0 vendor research, or eyeball-mode?

### Cross-bucket dependencies

- **b1b entirely blocks on Bucket 2 #1 (modularization shape).** Same dependency shape as prior audit.
- **A2 / M-band cascade blocks on Bucket 2 #2 (capability set).**
- **Bucket 3 entity gaps slot into modules from Bucket 2 #1's answer.**
- **Bucket 2 #4 (regulation scoping) may surface additional Bucket 3 entities** (NIST SP 800-53 control assessments, IRS Pub 1075 attestations).
- **Buckets 2 and 3 are otherwise independent of each other.**

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

State-driven Validate pass (SKILL.md Rule #21) over the open items in `audits/PS-LIC/state.yaml`.
Re-confirmed live that PS-LIC is still UNBUILT: `/domain_modules?domain_id=eq.46` and
`/capability_domains?domain_id=eq.46` both empty (domain id 46). Per UNBUILT discipline the agent
did NOT scaffold the module/capability build; that remains a user decision (B2-1 + B2-2) and its
whole cascade (B1B-M1, B1B-B12, B1B-B10b-RESIDUAL, B1B-B9-MISSING) stays parked. Three open items
were build-independent additive/corrective fixes and were executed at `record_status='new'`. C1
(business_function_domains owner = Business Operations, id 259) and B11 (11 alias rows across the 6
masters) were already satisfied live, so no insert was owed there. B1B-F2 remains RETIRED per the
2026-06-06 supersession (no per-module skill split owed). No JWT errors. No `notes` writes (Rule #15).
Loader: [.tmp_deploy/ps_lic_state_execute_2026_06_07.ts](../../.tmp_deploy/ps_lic_state_execute_2026_06_07.ts).

### Executed (3 write types, 16 rows)

- **B13 entity_type (6 PATCHes):** all 6 PS-LIC masters were `entity_type='unclassified'`. Each carries
  published-verb workflow trigger events implying workflow gates, so all 6 classified to
  `operational_workflow` (data_objects 641 permit_applications, 642 license_records, 643 permit_inspections,
  644 license_renewals, 645 code_violations, 646 regulatory_fees). Side effect: B12 lifecycle states are now
  REQUIRED (hard fail) on all 6, and pattern flags (B2-3) are now formally in scope. Both stay parked behind
  the M1 build.
- **event_category backfill (8 PATCHes):** all 8 trigger events on the masters had empty `event_category`.
  Backfilled to `lifecycle` for the 7 state-machine transitions (1052 permit_application.submitted, 1053
  permit_application.approved, 1054 license.issued, 1056 permit_inspection.scheduled, 1057
  permit_inspection.failed, 1058 code_violation.issued, 1059 regulatory_fee.assessed) and `threshold` for the
  one time-based event (1055 license_renewal.due).
- **A4 / Rule #20 catalog UX (1 PATCH, 2 fields):** `domains.catalog_tagline` and `domains.catalog_description`
  were both empty on domain 46. Authored buyer-voice copy (workflow + value, no vendor names, no em-dash,
  American English) and wrote both. No modules exist, so no module-level taglines were owed. The stale B2-5
  "surface-before-write" gate is superseded by the Rule #20 execute rule; B2-5 is resolved.

### Surfaced (user decisions, not executed)

- **B2-1** (modularization shape) and **B2-2** (capability set): the UNBUILT build. Pick both to unblock the
  entire b1b cascade.
- **B2-3** (pattern flag PATCHes per master): now in scope after B13; flipping any flag is a judgment write,
  surfaced not auto-executed. Recommended set carried forward.
- **B2-4** (FedRAMP / CMMC / StateRAMP / Section 508 mandatory-scoping) and **B2-6** (cost band / TAM refresh):
  independent judgment calls, unchanged.

### Left

- **b1b cascade** (B1B-M1, B1B-B12, B1B-B10b-RESIDUAL, B1B-B9-MISSING): all gate on the user build (B2-1 / B2-2)
  and, for B10b target FKs, on GRC M1 + ERP-FIN M1. No agent action until the build lands.
- **B1B-F2**: RETIRED per the 2026-06-06 supersession (per-module skill grain canceled). No action.
- **b3** (B3-1 through B3-10): Phase-0 speculative entity backlog, non-blocking, untouched.
