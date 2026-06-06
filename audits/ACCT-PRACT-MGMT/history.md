# ACCT-PRACT-MGMT audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 modules, 2 masters (`tax_returns` id=400, `client_engagements` id=401), 4 contributors (`engagement_letters` id=394 mastered by LEGAL-PRACT-MGMT, `time_entries` id=162 mastered by WFM, `supplier_invoices` id=75 mastered by S2P, `crm_contacts` id=98 mastered by CRM), 6 capabilities (ACCT-WORKFLOW, ACCT-CLIENT-PORTAL, ACCT-TIME-BILLING, ACCT-ENGAGEMENT-LTR, ACCT-DEADLINE-MGMT, ACCT-DOC-MGMT), 8 primary solutions, 5 regulations linked (IRS-PUB-4557, GLBA, AICPA-CODE mandatory; SOX conditional; SOC-2 recommended), 3 outbound handoffs, 0 inbound handoffs, 2 outbound `trigger_events` (both `event_category=lifecycle`), 0 lifecycle states, 0 aliases, 0 `data_object_relationships` (none intra-domain, none cross-domain, no users edges), 1 legacy `skills` row (`acct-pract-mgmt-system` id=25 with `domain_module_id=null`), 4 `skill_tools` (2 `query` platform, 1 `side_effect` platform `send_email`, 1 `side_effect` external `sign_document`).
- **Vendor-surface basis:** Karbon (cloud-native practice operating platform; strong workflow + email triage), Canopy (mid-market practice management + client portal), TaxDome (SMB-favored end-to-end: portal, e-sign, billing), Jetpack Workflow (recurring-task templating, SMB focus), CCH Axcess Practice (Wolters Kluwer enterprise-tier suite paired with tax-prep software), Aiwyn (AR + billing automation specialist), Liscio (secure client communications + document portal specialist), Ignition (engagement-letter + proposals + payment specialist). Catalog already enumerates all 8 as `primary`. The matrix covers solo/mid-market CPA practices on the US market; no separate compliance-specialist row needed since IRS Pub 4557 / GLBA / WISP obligations are embedded across all the practice-management suites rather than served by a standalone preparer-compliance vendor.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.
- **Cross-domain handoff count (N):** 3 outbound, 0 inbound. APQC expectation: 1.5 to 2.4 NEW `agent_curated` tags surfaced in Bucket 1 H1; one already exists at `record_status=new` (handoff 339, `proposal_source=agent_curated`, pointing at process id=300 which is a wrong fit and is up for revision). Two `discovery_substring` rows (handoffs 338, 340) already exist; both correctly land on process 1505 "Prepare tax returns".
- **Structural gate state:** **M1 hard fail** (zero `domain_modules`). Per the audit recipe, the M-band blocks every downstream concern; B / C / E / F findings below are surfaced for completeness, but every Bucket 1 structural fix that references modules is gated behind authoring the module set first.
- **Candidates queued in `audits/_missing-domains.md`:** 0. The flagship-vendor enumeration did not surface a market that lacks an existing `domains` row; the gaps inside ACCT-PRACT-MGMT are Phase 0 / Phase A / Phase B work on the domain itself, not new-domain proposals.

### Pass 1 - Structural (per-domain completeness checklist)

#### S-band coverage sweep

**S1. FK-to-`domains` coverage for ACCT-PRACT-MGMT (id=152).**

| Table | FK column | ACCT-PRACT-MGMT rows | Expected non-zero? |
| --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 6 (2 master + 4 contributor) | Yes (B1) - pass |
| `solution_domains` | `domain_id` | 8 (all `primary`) | Yes (A3) - pass |
| `business_function_domains` | `domain_id` | 4 (owner + 2 contributors + 1 consumer) | Yes (C1) - pass |
| `capability_domains` | `domain_id` | 6 | Yes (A2) - pass |
| `domain_regulations` | `domain_id` | 5 | Yes - pass |
| `domains.parent_domain_id` | n/a | n/a | Routinely zero - pass |
| `handoffs.source_domain_id` | `source_domain_id` | 3 | Yes (B9) - pass |
| `handoffs.target_domain_id` | `target_domain_id` | 0 | Usually yes - **anomaly** (no inbound captured) |
| `skills.domain_id` | `domain_id` | 1 (legacy, `domain_module_id=null`) | F2: one per module - **FAIL** (no modules) |
| `domain_modules.domain_id` | `domain_id` | 0 | Yes (M1) - **HARD FAIL** |
| `domain_module_host_domains.domain_id` | `domain_id` | 0 | Routinely zero - pass |
| `domain_aliases.domain_id` | `domain_id` | 0 | Optional - pass |

**S2. Indirect-table per-module coverage.** N / A (no modules). The zero-module condition makes S2 vacuously empty; routes to M1.

**S3. Per-master indirect-table coverage.**

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `tax_returns` | 0 | 1 (`tax_return.filed`) | 0 |
| `client_engagements` | 0 | 1 (`client_engagement.commenced`) | 0 |

Both masters are at zero states + zero aliases. Routes to B12 (lifecycle), B11 (aliases). Trigger events both carry `event_category=lifecycle` (correct enum), no need for B9 category patches on these two events.

#### A-band - Market shape

- **A1.** `domains` row has all 7 business-metadata fields populated. `crud_percentage=88`, `business_logic` non-empty (covers tax-calendar workflow generation, client-folder document-retention rules per IRS / state preparer requirements, engagement-letter e-signature chains with retainer-payment gating, capacity forecasting through tax season, per-engagement workflow checkpoints with sign-off), `min_org_size='10 xs <50'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=800`, `market_size_source_year=2024`. PASS.
- **A2.** 6 capabilities linked: ACCT-WORKFLOW, ACCT-CLIENT-PORTAL, ACCT-TIME-BILLING, ACCT-ENGAGEMENT-LTR, ACCT-DEADLINE-MGMT, ACCT-DOC-MGMT. PASS (>=3 floor).
- **A3.** 8 solutions linked, all `coverage_level='primary'`. PASS. (Worth noting: an all-`primary` distribution is unusual; secondary / partial rows could cover cross-market suites like ERP-FIN AR addons, but not a structural fail.)
- **A4.** `catalog_tagline` and `catalog_description` are both empty. **FAIL** - Bucket 2 (Rule #20 requires user-approved buyer-voice wording before write).
- **A5.** Skip per default (not requested).

#### M-band - Modules (Rule #14) - STRUCTURAL GATE

- **M1.** Zero `domain_modules` rows for `domain_id=152`. **HARD FAIL.** This is the dominant structural gate. With 6 capabilities, M2 requires >=2 full modules. The 2 masters cluster into module candidates per Pass-2 modularization proposal (see Bucket 2 module-shape decision).
- **M2.** Vacuous (no modules). Would require >=2 once modules are loaded.
- **M4 - M7.** All vacuous until M1 is cured.

#### B-band - Data-object footprint

- **B1.** 2 master rows. PASS (>=1 floor).
- **B2.** Both masters have `singular_label` and `plural_label` populated. PASS.
- **B3.** Both masters use prefixed names (`tax_returns`, `client_engagements`); neither is a bare word. `is_canonical_bare_word=false` on both, `naming_authority_rationale=''`. PASS.
- **B4.** Both masters have all three pattern flags = false. Positive re-evaluation: `tax_returns` carries human PII (taxpayer SSN, dependents' SSNs, income, deductions, account numbers, IRS audit-trail metadata) which is a strong candidate for `has_personal_content=true`. Once filed and accepted by the IRS, the return is effectively immutable from the practice's side (corrections require an amended return, a distinct workflow), so `has_submit_lock=true` is plausible on the `filed` state. `client_engagements` typically require partner sign-off on opening, so `has_single_approver=true` may apply. All three flag candidates surfaced to Bucket 2 for explicit confirmation per Rule #12.
- **B5.** No `embedded_master` rows for this domain. PASS (vacuously).
- **B6.** Zero intra-domain `data_object_relationships`. **FAIL.** Workflow ties absent: `client_engagements scopes tax_returns` (a single engagement may scope multiple-year returns or extension returns). With only 2 masters, the intra-domain edge set is minimal but the one edge above is load-bearing for the workflow graph. Bucket 1.
- **B7.** Zero `users` edges. **FAIL.** Expected user-actor edges: `tax_returns.preparer -> users`, `tax_returns.reviewer -> users` (partner sign-off), `client_engagements.engagement_partner -> users`, `client_engagements.engagement_manager -> users`, `client_engagements.assigned_staff -> users` (line accountants). Bucket 1.
- **B8.** Zero cross-domain `data_object_relationships`. **FAIL.** Three outbound handoffs exist (B9) but no mirror relationship rows: `tax_returns reports_to <grc-tax-compliance>` (GRC payload), `client_engagements references_letter engagement_letters` (LEGAL-PRACT-MGMT consumer; the engagement_letter is the contract artifact under the engagement), `engagement_letters scopes_into client_engagements` (CLM payload). The `tax_returns -> AP-AUTO` mirror is itself questionable (handoff 340 lists payload `supplier_invoices`/id=75 which doesn't obviously fall out of `tax_return.filed`; surfaced as Bucket 2 architectural review). Bucket 1.
- **B9.** 2 outbound `trigger_events` + 3 outbound `handoffs` rows. Both events carry `event_category=lifecycle` (correct enum). PASS on event-category coverage. The two events are:
  - `tax_return.filed` (id=331, `data_object_id=400`) - fans out to 2 handoffs (id=338 -> GRC, id=340 -> AP-AUTO).
  - `client_engagement.commenced` (id=332, `data_object_id=401`) - has zero handoffs. Mid-fail: the structural pass test (every published verb has a matching trigger_event + at least one handoff somewhere) is partially met - the event exists but with no consumer. Either authentic-no-consumer (state machine should annotate via Rule #12) or a missing outbound handoff (e.g. to AGENCY-MGMT, ITSM-style provisioning, or an internal staffing module). Bucket 1.

  Additional events the catalog should likely carry but doesn't: `tax_return.accepted_by_irs`, `tax_return.rejected_by_irs`, `tax_return.amended`, `client_engagement.completed`, `client_engagement.terminated`. Bucket 1.

  Outbound handoff table:

  | handoff_id | event_name | data_object | target | pattern | friction | source_module_FK | target_module_FK |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 338 | `tax_return.filed` | `tax_returns` (id=400) | GRC | batch_sync | low | NULL | NULL |
  | 339 | `engagement_letter.signed` | `engagement_letters` (id=394) | CLM | manual_handoff | medium | NULL | NULL (CLM has 5 modules) |
  | 340 | `tax_return.filed` | `supplier_invoices` (id=75) | AP-AUTO | batch_sync | low | NULL | NULL |

  Note on handoff 339: the trigger event `engagement_letter.signed` is NOT in the `trigger_events` rows queryable from `tax_returns` / `client_engagements` masters (the event sits on `engagement_letters` which is LEGAL-PRACT-MGMT-mastered). The handoff legitimately fires from ACCT-PRACT-MGMT (consumer / contributor of the letter) but the trigger event's master ownership is LEGAL-PRACT-MGMT - this is OK by construction (the handoff says ACCT publishes the signal forward into CLM after consuming it; LEGAL-PRACT-MGMT separately may also publish the same event onward).

  Note on handoff 340: the handoff payload `data_object_id=75` (`supplier_invoices`) and the trigger event `tax_return.filed` (which fires on `tax_returns` id=400) do not pair cleanly. Either (a) the handoff is mis-modeled (should be a different trigger event like `tax_invoice.issued` on a yet-to-be-loaded entity), or (b) AP-AUTO consumes the tax-return-filed event to trigger payable creation for the tax filing fee. The narrative reading is more naturally case (a). Bucket 2.

- **B9b.** Skipped (no modules; <2-module floor). When modules are authored, intra-domain cross-module handoffs need to be drafted (e.g. `client_engagement.commenced` -> WORKFLOW module instantiating tasks; `tax_return.filed` -> BILLING module triggering invoice creation; `tax_return.accepted_by_irs` -> CLIENT-PORTAL notifying client).
- **B10.** Inbound report-only. Zero inbound handoff rows. Catalog suggests the following candidate inbound dependencies via the 4 contributor rows:
  - `engagement_letters` (id=394, role=contributor, necessity=required) mastered by LEGAL-PRACT-MGMT (id=150). LEGAL B9 owes outbound on `engagement_letter.signed` / `.executed` / `.terminated` to ACCT-PRACT-MGMT (mirrors handoff 339 going outbound, but the inbound from LEGAL into ACCT isn't loaded).
  - `time_entries` (id=162, role=contributor, necessity=required) mastered by WFM (id=59). WFM B9 owes outbound on `time_entry.submitted` / `.approved` / `.locked` to ACCT-PRACT-MGMT (time entries roll up into engagement billing).
  - `supplier_invoices` (id=75, role=contributor, necessity=required) mastered by S2P (id=27). S2P B9 owes outbound on `supplier_invoice.approved` / `.paid` to ACCT-PRACT-MGMT (supplier invoices paid by the firm; this is a less obvious dependency but the contributor row is in the catalog).
  - `crm_contacts` (id=98, role=contributor, necessity=required) mastered by CRM (id=69). CRM B9 owes outbound on `crm_contact.upserted` / `.merged` to ACCT-PRACT-MGMT (client master upserts feed practice management).
- **B10b.** Every handoff in B9 has `source_domain_module_id=NULL` and `target_domain_module_id=NULL`. Source side is owed by THIS domain once M1 is cured. Target side: handoff 339 (-> CLM) can be backfilled today since CLM has 5 modules; the natural target is CLM-REPOSITORY or CLM-OBLIGATION-MGMT (signed engagement letter lands in repository and creates obligation tracking). GRC and AP-AUTO have zero modules per spot-check; their target-side fix waits on their modularization. Bucket 1 (source side); Report-only for GRC and AP-AUTO target-side; Bucket 1 (or report-only-on-CLM) for CLM target-side.
- **B11.** Zero aliases on either master. Expected cross-vendor / cross-industry synonyms: `tax_returns` <-> "1040", "1120", "1065", "1041", "990" (form-number aliases; aliases are typically the form code itself when CPA software lists "Form 1040" alongside "Tax Return"); `client_engagements` <-> "Engagement" (Karbon / Canopy / TaxDome universally call them "Engagements"), "Job" (Jetpack Workflow terminology), "Matter" (legal-adjacent term, especially for tax-controversy work), "Project" (some bookkeeping-focused PM suites). The "Engagement" alias is essentially the canonical industry term and is most load-bearing. Bucket 1.
- **B12.** Zero `data_object_lifecycle_states` across both masters. **FAIL.** Both have observable state machines:
  - `tax_returns`: draft / in_preparation / in_review / awaiting_client_signature / signed / filed / accepted_by_irs / rejected_by_irs / amended / archived.
  - `client_engagements`: prospective (proposal sent) / engagement_letter_pending / engagement_letter_signed / retainer_received / active / on_hold / completed / terminated / archived.

  Bucket 1.

#### C-band - Functional ownership

- **C1.** 4 `business_function_domains` rows: owner=`Accounting`, contributor=`Sales`, contributor=`Customer Service`, consumer=`Compliance Operations`. PASS.
- **C2.** Zero `business_function_capabilities` overrides. Plausible overrides:
  - `ACCT-CLIENT-PORTAL` is closer to `Customer Service` than `Accounting` (it's the client-facing surface).
  - `ACCT-ENGAGEMENT-LTR` is closer to `Sales` than `Accounting` (proposal + retainer at the front of the engagement lifecycle).
  - `ACCT-DOC-MGMT` is closer to `Compliance Operations` (retention rules per IRS Pub 4557 / WISP / state preparer obligations).

  Surfaced to Bucket 2 for explicit decision.

#### D-band - UI spot-check

- **D1.** Not run as part of this audit pass. Standard URL pattern: `https://tests.semantius.app/domain_map/<table>`.

#### E-band - Roles and permission bundling

- **E1 - E6.** All vacuous until M1 is cured. Multi-module domains (>=2 modules expected here since 6 capabilities) need >=3 roles. ACCT-PRACT-MGMT's typical personas: Tax Partner (engagement signer, return reviewer), Tax Manager (engagement manager, workflow owner), Tax Staff (preparer / line accountant), Bookkeeper (recurring bookkeeping engagements), Practice Administrator (firm-wide billing, capacity, reporting), Client (read-only via portal). To be authored after modules.

#### F-band - Skill-layer integrity

- **F1.** 1 legacy `skills` row (`acct-pract-mgmt-system` id=25) with `domain_module_id=null`. Acceptable transitional state ONLY because no module-level skill exists yet. Once modules are authored, this legacy row must be retired (DELETE) or split into module-level skills (one `<module_code_lower>_agent` per module). Bucket 1.
- **F2.** Zero module-level system skills (vacuous: no modules). **FAIL** (gated by M1).
- **F3.** Legacy skill has 4 `skill_tools` rows: 2 `query` rows (`query_tax_returns`, `query_client_engagements`, both `coverage_tier=platform`), 1 `side_effect` (`send_email`, `coverage_tier=platform`), 1 `side_effect` (`sign_document`, `coverage_tier=external`). The tool set is thin: zero `mutate` (no `create_tax_return`, `update_client_engagement`, `transition_tax_return_to_filed`), zero workflow gates (no `submit_for_review`, `partner_signoff`, `release_for_efile`), zero `fetch` (no IRS-acceptance polling, no QuickBooks / Xero / GL pull, no tax-research-database lookup), zero `inbound` (no IRS-acceptance webhook receiver, no e-sign callback). Once modules are split, the per-module skill tool sets need to be redistributed and expanded. Bucket 1.
- **F4.** All 4 linked tools pair `operation_kind` and `data_object_id` correctly (2 `query` rows have `data_object_id` set; the 2 `side_effect` rows have `data_object_id=null`). PASS on the invariant.
- **F5.** Semantius score uncomputable (no modules). Routes to F2 + F3. Tool-level note: the 1 external row (`sign_document`) drops the strict score, while `operational_score` depends on `tool_solutions` rows for sign_document (DocuSign, Adobe Acrobat Sign, Dropbox Sign) which were not queried in this audit.
- **F7.** `send_email` is a channel primitive linked to the legacy skill. Per the channel-vs-capability authoring rule, the default for generic notifications is `notify_person`; client communications in CPA practice (return-ready notice, engagement-letter sign reminder, missing-document follow-up) are substitutable-channel (email, SMS, portal-push are all valid per Karbon / Canopy / TaxDome). When modules are split and the legacy skill retired, the per-module reminder skill should link `notify_person`, not `send_email` directly, unless the workflow specifically requires email (e.g. a regulator-mandated PDF acknowledgement, which is not the case here). Bucket 1.

#### H-band - APQC coverage

- **H1.** 3 `handoff_processes` rows exist across 3 outbound handoffs (100% coverage by count, but 0 are `record_status=approved`). PASS on existence; FAIL on quality.
  - Handoff 338 (`tax_return.filed` -> GRC) tagged `proposal_source=discovery_substring`, `record_status=new`, process id=1505 "Prepare tax returns" (PCF L4, external_id=10931). Substring match is reasonable but the L3 parent process 328 "Process taxes" (external_id=10766) is the better cluster home for the `.filed` event (the discovery substring matched on "tax returns" but the handoff is the filing transition, not the preparation activity).
  - Handoff 339 (`engagement_letter.signed` -> CLM) tagged `proposal_source=agent_curated`, `record_status=new`, process id=300 "Evaluate and manage financial performance" (PCF L3, external_id=10741). **Wrong fit:** the engagement-letter handoff to CLM is a contract-management transition, not a financial-performance evaluation. Should be process id=807 "Manage contracts" (PCF L4, external_id=10291) or its parent id=398 "Negotiate and document agreements / contracts" (PCF L3, external_id=11052).
  - Handoff 340 (`tax_return.filed` -> AP-AUTO) tagged `proposal_source=discovery_substring`, `record_status=new`, process id=1505 "Prepare tax returns" (PCF L4, external_id=10931). Same caveat as 338, and the payload mis-modeling concern (supplier_invoices payload on a tax_return event) means the right PCF might be id=315 "Process accounts payable (AP)" (PCF L3, external_id=10756) if the handoff is corrected.

  Catalog-quality headline: 0 of 3 handoffs carry an `approved` tag (0% coverage). Process-health side-bar: 1 `agent_curated` row (handoff 339, wrong fit). This audit proposes 3 new / revised `agent_curated` tags (Bucket 1 H1 table below) plus 0 deferrals.

### Pass 2 - Market audit (semantic)

Vendor surface enumerated from flagship knowledge plus the 8 already-loaded solutions. ACCT-PRACT-MGMT is a niche but stable market with clear feature anchors: workflow templating (recurring tax-prep tasks against the tax calendar), client portal (document exchange + e-sign), time + billing, engagement-letter + proposal management, document management with retention rules, and capacity / due-date analytics. Vendors cluster around three buying axes: (1) end-to-end cloud-native (TaxDome, Canopy, Karbon for the mid-market) targeting solo to 50-staff firms; (2) workflow-first SMB (Jetpack Workflow, Aiwyn for billing); (3) enterprise-tier suite-embedded (CCH Axcess Practice, Thomson Reuters CS Professional Suite if added) where practice management ships alongside the tax-prep software. Compliance specialists for IRS Pub 4557 / GLBA WISP requirements are typically embedded in the platforms rather than sold standalone (Liscio's secure-communications angle is the closest specialist).

**MISSING entities** (in market surface, not in catalog footprint):

| entity | category | flagship evidence | proposed cluster | compliance basis |
| --- | --- | --- | --- | --- |
| `acct_engagement_proposals` | master | Karbon proposals, TaxDome proposals, Ignition proposals | ACCT-ENGAGEMENT-LTR-MGMT | - |
| `acct_workflow_templates` | config-master | Karbon templates, Jetpack Workflow templates, Canopy task templates | ACCT-WORKFLOW | - |
| `acct_workflow_tasks` | master | Karbon tasks (per-engagement instantiated work items), TaxDome tasks, Jetpack tasks | ACCT-WORKFLOW | - |
| `acct_client_documents` | master | TaxDome client portal vault, Liscio secure files, Canopy file shares | ACCT-CLIENT-PORTAL | IRS Pub 4557 retention |
| `acct_client_messages` | master | Karbon Triage email + chat, Liscio secure messaging, TaxDome chat | ACCT-CLIENT-PORTAL | GLBA confidentiality |
| `acct_invoices` | master | Aiwyn invoicing, Karbon billing, Canopy billing, Ignition billing | ACCT-TIME-BILLING | PCI-DSS (payment integrations) |
| `acct_payment_transactions` | master | TaxDome / Ignition / Aiwyn integrated POS (Stripe, ACH) | ACCT-TIME-BILLING | PCI-DSS |
| `acct_tax_calendar_deadlines` | config-master | Karbon recurring tasks against tax deadlines, CCH Axcess Practice tax-calendar engine | ACCT-DEADLINE-MGMT | - |
| `acct_capacity_forecasts` | derived/master | Karbon capacity boards, Canopy capacity, TaxDome KPIs | ACCT-WORKFLOW | - |
| `acct_engagement_acceptance_checks` | master | Karbon client acceptance, Ignition KYC checks | ACCT-INTAKE-CONFLICT (new module) | AICPA-CODE (independence checks), AML for tax-controversy |
| `acct_e_signature_envelopes` | master | TaxDome built-in e-sign, Ignition signature, Canopy e-sign | ACCT-CLIENT-PORTAL | IRS-PUB-4557, e-Sign Act |
| `acct_retainer_balances` | master | TaxDome retainer wallet, Ignition retainer, Canopy retainer | ACCT-TIME-BILLING | trust-accounting (state-by-state for CPAs accepting client funds) |

**WRONG-OWNERSHIP** - none identified (zero modules means nothing is wrongly assigned yet; categorize at module authoring time). One contributor row warrants Bucket 2 review: `engagement_letters` (id=394) is mastered by LEGAL-PRACT-MGMT (id=150). The CPA-practice engagement letter is conceptually distinct from the law-firm engagement letter (different obligations, different retention, different regulatory anchors: AICPA SSARS vs. ABA Model Rules), and a single canonical master may be over-consolidated. Bucket 2 architectural decision.

**SCOPE-CREEP** - one potential row: `supplier_invoices` (id=75, mastered by S2P). The contributor role for ACCT-PRACT-MGMT on S2P-mastered supplier invoices is non-obvious; the natural model is that the CPA firm's own AP runs via ERP-FIN / AP-AUTO, while client-side supplier invoices (for clients whose bookkeeping the firm performs) belong to whatever module hosts client-financials. Surfaced as Bucket 2 review; recommend NOT auto-deleting until the user clarifies.

**MODULARIZATION-ISSUE** - zero modules. The 6 capabilities map naturally to 5 modules. Recommended split:

| module candidate | masters (current + proposed) | covered capabilities |
| --- | --- | --- |
| ACCT-ENGAGEMENT-LTR-MGMT | acct_engagement_proposals, engagement_letters (embedded_master from LEGAL or local-master), acct_engagement_acceptance_checks, acct_e_signature_envelopes (embedded with ACCT-CLIENT-PORTAL or master here) | ACCT-ENGAGEMENT-LTR |
| ACCT-WORKFLOW | client_engagements (master), acct_workflow_templates, acct_workflow_tasks, acct_capacity_forecasts, acct_tax_calendar_deadlines (or moved to ACCT-DEADLINE-MGMT module) | ACCT-WORKFLOW, ACCT-DEADLINE-MGMT |
| ACCT-TAX-RETURNS | tax_returns (master) | (capability cluster spans ACCT-WORKFLOW for prep tasks; this module is the publisher of tax-return state) |
| ACCT-CLIENT-PORTAL | acct_client_documents (master), acct_client_messages (master), acct_e_signature_envelopes (master here is more natural) | ACCT-CLIENT-PORTAL, ACCT-DOC-MGMT |
| ACCT-TIME-BILLING | time_entries (contributor from WFM), acct_invoices (master), acct_payment_transactions (master), acct_retainer_balances (master) | ACCT-TIME-BILLING |

Open question: TAX-RETURNS being a separate module vs. merged into WORKFLOW. Tax-prep workflow + tax-return state are tightly coupled in IDEXX-cousin platforms (CCH Axcess Practice, UltraTax); the split makes sense only if the user expects standalone "publish tax-return-state without our workflow engine" as a deploy pattern. Bucket 2 architectural decision.

### Pass 3 - Neighbor discovery

Edge weights derived from outbound `handoffs` (B9 table), inbound dependencies via contributor rows, and shared masters:

| neighbor | edge weight | outbound events | inbound | dependencies | notes |
| --- | --- | --- | --- | --- | --- |
| GRC | 1 | `tax_return.filed` | 0 | - | tax-compliance reporting |
| CLM | 1 | `engagement_letter.signed` (via id=339; LEGAL-mastered payload) | 0 | - | engagement letter as contract artifact |
| AP-AUTO | 1 | `tax_return.filed` (with `supplier_invoices` payload; mis-modeled) | 0 | - | AP-side tax-filing-fee payable (questioned) |
| LEGAL-PRACT-MGMT | 1 | - | (implied via id=394 contributor) | `engagement_letters` | engagement-letter master owner |
| WFM | 1 | - | (implied via id=162 contributor) | `time_entries` | timekeeper data feeding billing |
| S2P | 1 | - | (implied via id=75 contributor) | `supplier_invoices` | drug-supplier invoice routing (questioned) |
| CRM | 1 | - | (implied via id=98 contributor) | `crm_contacts` | client master upserts |

No neighbor reaches edge weight >=3. Per the audit recipe, each neighbor gets a one-line summary instead of the full 5-section diff. Note: CLM (5 modules), CRM (5 modules), LEGAL-PRACT-MGMT (5 modules) are the modularized neighbors; GRC, AP-AUTO, WFM, S2P all have zero `domain_modules` per spot-check (M1 hard fail on each).

### Pass 4 - Pairwise reconciliation per neighbor

#### GRC (edge weight 1) - one-line summary

One outbound (338 `tax_return.filed` -> GRC) for tax-compliance reporting. NULL source + target module FKs. GRC has 0 modules per spot-check; target-side B10b fix waits on GRC modularization. No mirror `data_object_relationships` row exists; Bucket 1 B8 fix needed (e.g. `tax_returns reports_to <grc-tax-compliance-payload>`). APQC tag exists (discovery_substring on PCF 1505) but the cluster better fits PCF L3 process 328 "Process taxes" or PCF L3 process 207 "Submit regulatory reports".

#### CLM (edge weight 1) - one-line summary

One outbound (339 `engagement_letter.signed` -> CLM) for contract repository / obligation tracking. NULL source + target module FKs. CLM has 5 modules; the natural target is `CLM-REPOSITORY` (id=127, where the signed letter lands) with `CLM-OBLIGATION-MGMT` (id=128) as a secondary if downstream obligation extraction fires. Target-side B10b fix is actionable today on CLM's own audit (CLM is modularized). Existing APQC tag (`agent_curated`, process 300 "Evaluate and manage financial performance") is the **wrong fit**; should be process id=807 "Manage contracts" or id=398 "Negotiate and document agreements / contracts". No mirror `data_object_relationships` row; Bucket 1 B8 fix needed (e.g. `engagement_letters scopes_into client_engagements`, `client_engagements references_letter engagement_letters`).

#### AP-AUTO (edge weight 1) - one-line summary

One outbound (340 `tax_return.filed` -> AP-AUTO with payload `supplier_invoices` id=75) for AP creation. NULL source + target module FKs. AP-AUTO has 0 modules per spot-check; target-side fix waits. **Payload mis-modeling concern**: the trigger event publishes on `tax_returns` (id=400) but the payload is `supplier_invoices` (id=75). Either (a) the handoff is mis-modeled and should fire on a different event (e.g. `tax_invoice.issued`), or (b) the handoff name should be redrawn (AP profile creation for a new client's payable workflow). Bucket 2 architectural decision.

#### LEGAL-PRACT-MGMT (dependency-only, edge weight 1) - report-only

`engagement_letters` (id=394) is mastered in LEGAL-PRACT-MGMT (id=150); ACCT-PRACT-MGMT consumes as contributor. No inbound handoff today. Report-only follow-up: LEGAL-PRACT-MGMT B9 owes outbound on `engagement_letter.signed` / `.executed` / `.terminated` to ACCT-PRACT-MGMT once both are modularized. Bucket 2 architectural decision: is the CPA-firm engagement letter conceptually the same master as the law-firm engagement letter (consolidated master, current shape) or should it split into a CPA-specific master (`acct_engagement_letters`) and a law-specific master (`legal_engagement_letters`)? Different obligations, different retention rules, different statutory anchors.

#### WFM (dependency-only, edge weight 1) - report-only

`time_entries` (id=162) is mastered in WFM (id=59); ACCT-PRACT-MGMT consumes as contributor (timekeeper data feeds engagement billing). No inbound handoff. Report-only follow-up: WFM B9 owes outbound on `time_entry.submitted` / `.approved` / `.locked` to ACCT-PRACT-MGMT once WFM is modularized.

#### S2P (dependency-only, edge weight 1) - report-only

`supplier_invoices` (id=75) is mastered in S2P (id=27); ACCT-PRACT-MGMT consumes as contributor. No inbound handoff. The dependency reading is non-obvious: a CPA practice's contributor role on S2P-mastered supplier invoices likely covers the firm's own AP (vendor invoices the firm pays) rather than client-side AP. Bucket 2 architectural review on the contributor row's scope.

#### CRM (dependency-only, edge weight 1) - report-only

`crm_contacts` (id=98) is mastered in CRM (id=69); ACCT-PRACT-MGMT consumes as contributor (client contact master upserts). No inbound handoff. Report-only: CRM B9 owes outbound on `crm_contact.upserted` / `.merged` to ACCT-PRACT-MGMT.

### Bucket 1 - In-scope confirmed gaps

**Bucket 1 sub-categorization** (13 line items by finding type):

| finding type | count |
| --- | --- |
| MISSING (entity gap, in scope at module-authoring time) | 0 (deferred to Bucket 3 per audit recipe) |
| STRUCTURAL | 8 |
| BOUNDARY | 4 |
| APQC TAGGING | 1 (covers 3 proposed revisions + 0 deferred) |

#### STRUCTURAL findings

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows | Author the 5-module set (ACCT-ENGAGEMENT-LTR-MGMT, ACCT-WORKFLOW, ACCT-TAX-RETURNS, ACCT-CLIENT-PORTAL, ACCT-TIME-BILLING) per Pass-2 modularization. Bucket 2.1 confirms shape (4-vs-5 module split, separate TAX-RETURNS module yes / no, separate ACCT-DEADLINE-MGMT module yes / no) first. |
| B1-S2 | A4 | `catalog_tagline` and `catalog_description` empty | Draft both in buyer voice per Rule #20; surface to user for approval (Bucket 2.2). |
| B1-S3 | B6 | Zero intra-domain `data_object_relationships` | Draft 1 edge: `client_engagements scopes tax_returns` (cardinality 1:N, optional, source-master = client_engagements). The single relationship at the two-master level is minimal but load-bearing. Load via cluster-drafts pattern. |
| B1-S4 | B7 | Zero `users` edges | Draft ~5 edges: `tax_returns.preparer -> users`, `tax_returns.reviewer -> users` (partner sign-off), `client_engagements.engagement_partner -> users`, `client_engagements.engagement_manager -> users`, `client_engagements.assigned_staff -> users`. |
| B1-S5 | B9 (missing handoff or terminal-state annotation) | `client_engagement.commenced` (id=332) has zero `handoffs` rows | Decide: (a) author intra-domain handoffs once modules exist (commenced -> WORKFLOW module instantiating tasks, commenced -> CLIENT-PORTAL module provisioning portal access), OR (b) confirm the event is terminal-by-design (no downstream subscribers needed) and note rationale via Bucket 2 not via `trigger_events.notes` (Rule #15). Recommendation: option (a) once modules exist; the engagement-commenced transition almost always has at least one workflow / portal subscriber. |
| B1-S6 | B9 (missing events) | Likely-missing trigger events on `tax_returns`: `tax_return.accepted_by_irs`, `tax_return.rejected_by_irs`, `tax_return.amended`. On `client_engagements`: `client_engagement.completed`, `client_engagement.terminated`. | Draft these 5 events with `event_category=lifecycle` (4) / `state_change` (`amended` could go either way; recommend `state_change`). Without these, the lifecycle states from B12 won't have corresponding event rows, and the practice-workflow story stops at `.filed` / `.commenced`. |
| B1-S7 | B11 | Zero aliases on either master | Draft ~6 alias rows: `tax_returns` <-> "1040" (vendor / form-code, when the row carries a form-specific filter), "1120", "1065"; `client_engagements` <-> "Engagement" (universal industry term; Karbon / Canopy / TaxDome standard), "Job" (Jetpack Workflow), "Project" (some PM-flavored suites). The "Engagement" alias is the most load-bearing. |
| B1-S8 | B12 | Zero `data_object_lifecycle_states` across both masters | Author state machines per masters list in B12 above. `tax_returns` (10 states from `draft` through `archived`), `client_engagements` (9 states from `prospective` through `archived`). Bucket 2.5 confirms no config-shape exemption for either master (both have observable workflows). |
| B1-S9 | F1 + F3 + F7 | Legacy `acct-pract-mgmt-system` skill (id=25, `domain_module_id=null`) + thin tool set (2 `query` + 1 `send_email` + 1 `sign_document`, no `mutate` / `fetch` / `inbound`) + F7 channel-vs-capability: `send_email` is generic-notification flavor | Retire legacy skill (DELETE) once module-level skills are authored under Phase S. Per-module tool set extensions per module: `mutate_tax_return_status`, `mutate_client_engagement_state`, `fetch_irs_acceptance_status`, `fetch_quickbooks_gl`, `fetch_xero_gl`, `inbound_receive_irs_acceptance_webhook`, `inbound_receive_esign_callback`, `inbound_receive_payment_settlement`. Switch `send_email` to `notify_person` for generic client notifications; keep `sign_document` since e-signature IS the workflow (envelope-completion contract). |

#### BOUNDARY findings (per neighbor)

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-B1 | B10b (outbound) | All 3 outbound handoffs have `source_domain_module_id=NULL` | Backfill once ACCT-PRACT-MGMT modules exist: handoff 338 (`tax_return.filed` -> GRC) routes from ACCT-TAX-RETURNS; handoff 339 (`engagement_letter.signed` -> CLM) routes from ACCT-ENGAGEMENT-LTR-MGMT; handoff 340 (`tax_return.filed` -> AP-AUTO) routes from ACCT-TAX-RETURNS (pending Bucket 2.4 payload review). |
| B1-B2 | B10b (target side, CLM) | Handoff 339 `target_domain_module_id=NULL`; CLM has 5 modules | Backfill `target_domain_module_id` to CLM-REPOSITORY (id=127) as the natural landing module for the signed letter; if obligation extraction is in scope, also create a sibling handoff to CLM-OBLIGATION-MGMT (id=128). Actionable today since CLM is modularized. (Report-only-on-CLM if the user prefers to schedule CLM's own audit to own the backfill.) |
| B1-B3 | B8 (CLM mirror) | No outbound `data_object_relationships` mirroring handoff 339 | Author edge `engagement_letters scopes_into client_engagements` and `client_engagements references_letter engagement_letters` (both intra-cluster relationships; the letter is the LEGAL-mastered artifact, the engagement is the ACCT-mastered workflow envelope). |
| B1-B4 | B8 (GRC mirror) | No outbound `data_object_relationships` for `tax_returns -> GRC` payload | Author `tax_returns reports_to <grc-tax-compliance-obligation>` once GRC's tax-compliance master is identified (likely a future `compliance_obligations` master under a GRC compliance-reporting module). For the audit, surface as deferred-pending-GRC-modularization. |

#### APQC TAGGING

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-H1 | H1 | 3 of 3 outbound handoffs carry tags but 0 are approved; handoff 339 is mis-tagged (agent_curated wrong-fit) | Author 3 NEW `agent_curated` rows per table below, supplementing the existing rows. The existing wrong-fit row on handoff 339 should be marked for review (DELETE-and-replace or PATCH process_id from 300 to 807, user's call). Existing `discovery_substring` rows on 338 and 340 stay as low-confidence tags; the new `agent_curated` rows are the higher-confidence overlay. |

**B1-H1 proposed tags** (`proposal_source='agent_curated'`, `record_status='new'`):

| handoff_id | source -> target | trigger_event | payload | proposed PCF row | PCF id | external_id | confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 338 | ACCT-PRACT-MGMT -> GRC | `tax_return.filed` | `tax_returns` | Process taxes | 328 | 10766 | confident L3 (parent of "Prepare tax returns"; the handoff is the filing-emission, not the preparation activity, so the L3 cluster home is the right level) |
| 339 | ACCT-PRACT-MGMT -> CLM | `engagement_letter.signed` | `engagement_letters` | Manage contracts | 807 | 10291 | confident L4 (replaces wrong-fit existing agent_curated row pointing at process 300 "Evaluate and manage financial performance") |
| 340 | ACCT-PRACT-MGMT -> AP-AUTO | `tax_return.filed` | `supplier_invoices` (payload mis-modeling concern) | Process accounts payable (AP) | 315 | 10756 | tentative L3 (PCF fit assumes the intent is AP-side processing of the tax-filing fee or AP profile creation; if the payload is corrected via Bucket 2.4, the PCF mapping may shift to a tax-specific cluster) |

**Deferred to Discover Pass 3:** 0 rows. All 3 cross-domain handoffs have a clean PCF cross-industry fit at L3 or L4.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module shape confirmation.** The Pass-2 5-module split (ACCT-ENGAGEMENT-LTR-MGMT + ACCT-WORKFLOW + ACCT-TAX-RETURNS + ACCT-CLIENT-PORTAL + ACCT-TIME-BILLING) is the proposed default; alternatives are (a) 4-module split merging ACCT-TAX-RETURNS into ACCT-WORKFLOW (tight coupling between tax-prep tasks and tax-return state in flagship suites), (b) 6-module split adding a dedicated ACCT-DEADLINE-MGMT module for the tax-calendar engine (rather than folding into WORKFLOW), (c) 7-module split adding ACCT-INTAKE-CONFLICT for client-acceptance + independence checks (relevant for larger firms). Decision shape: name the module set before B1-S1 can proceed. Options: (a) 5-module split as proposed; (b) 4-module split merging TAX-RETURNS into WORKFLOW; (c) 6-module split adding DEADLINE-MGMT; (d) 7-module split adding INTAKE-CONFLICT.
2. **`catalog_tagline` and `catalog_description` wording (A4 + Rule #20).** Per Rule #15 / Rule #20, the agent does NOT auto-draft these; the user authors or approves a buyer-voice tagline + 1-3 paragraph description. Agent can propose drafts but cannot write without approval. Independent.
3. **`tax_returns` pattern flags (B4).** Three candidates: `has_personal_content=true` (taxpayer SSN, dependents, income, account numbers; the federal-tax-return record is some of the most sensitive PII in the catalog); `has_submit_lock=true` (post-filing, the return is effectively immutable from the firm's side; corrections require an amended return as a separate row, not edit-in-place); `has_single_approver=true` (partner sign-off precedes filing, near-universal in CPA practice). Decision: PATCH which of the three?
4. **Handoff 340 payload review (B9 + B1-H1 confidence).** The handoff fires on `tax_return.filed` (event on `tax_returns` id=400) but the payload is `supplier_invoices` (id=75). Two interpretations: (a) **mis-modeled**: the handoff should either fire on a different event (e.g. a new `tax_filing.invoice_issued` event on a yet-to-be-modeled `acct_invoices` master) OR target a different domain (ERP-FIN for AR profile, not AP-AUTO); (b) **AP profile creation**: the firm's filing of a client's tax return triggers a payable workflow for the IRS tax-filing fee (less likely; this is typically billed to the client, not booked as a firm AP), or for the firm's e-file vendor (more plausible). Decision: keep / rewire / delete handoff 340?
5. **`engagement_letters` master ownership (Bucket 1 B1-B3 + Pass 4 LEGAL-PRACT-MGMT).** The catalog has `engagement_letters` (id=394) mastered by LEGAL-PRACT-MGMT (id=150). CPA-firm engagement letters and law-firm engagement letters have different statutory anchors (AICPA SSARS vs. ABA Model Rules), different retention rules, and different obligation structures. Decision options: (a) **leave consolidated** (one master, both LEGAL-PRACT-MGMT and ACCT-PRACT-MGMT contribute / consume); (b) **split into two masters** (`acct_engagement_letters` mastered by ACCT-PRACT-MGMT-ENGAGEMENT-LTR-MGMT module; `legal_engagement_letters` stays under LEGAL-PRACT-MGMT-INTAKE-CONFLICT module); (c) **rename + reattribute** (current master becomes `professional_engagement_letters`, both domains contribute under different sub-types). Independent of module shape.
6. **`supplier_invoices` contributor row review (Bucket 1 B8 + Pass 4 S2P).** The contributor role for ACCT-PRACT-MGMT on S2P-mastered supplier invoices needs clarification: is this (a) the firm's own AP for vendor invoices the firm pays (in which case the row is reasonable but the data flow runs ACCT firm finance, NOT client-AP); (b) client-side supplier invoices the firm processes as bookkeeper (more natural fit for a future bookkeeping-services module); (c) erroneous (should not be a contributor at all)? Decision: keep / refactor / delete the contributor row.

### Bucket 3 - Phase 0 pending (speculative)

Vendor-knowledge-based candidates from Pass 2 MISSING entities, not yet anchored to a formal Phase 0 vendor surface document. Each candidate names the flagship source.

1. **`acct_engagement_proposals` + `acct_engagement_acceptance_checks` + `acct_e_signature_envelopes`** (Karbon proposals, Ignition proposals + KYC, TaxDome e-sign, Canopy e-sign). Phase 0 verification: proposal vs. engagement-letter as distinct masters (the proposal is pre-signing, the letter is the signed artifact); independence checks (AICPA-CODE) as a master vs. attribute on the engagement. Recommended cluster: ACCT-ENGAGEMENT-LTR-MGMT.
2. **`acct_workflow_templates` + `acct_workflow_tasks` + `acct_capacity_forecasts` + `acct_tax_calendar_deadlines`** (Karbon templates, Jetpack Workflow recurring rules, CCH Axcess Practice tax-calendar engine, Canopy templates). Phase 0: confirm template vs. instantiated-task as distinct masters; capacity forecasts as derived from staff allocation + deadline calendar. Recommended cluster: ACCT-WORKFLOW (+ ACCT-DEADLINE-MGMT if split per Bucket 2.1).
3. **`acct_client_documents` + `acct_client_messages`** (TaxDome client portal vault, Liscio secure messaging, Canopy file shares). Phase 0: document retention rules per IRS Pub 4557 (typically 3-7 years post-filing) + GLBA confidentiality; secure-messaging as separate master from generic chat (load-bearing for audit-trail). Recommended cluster: ACCT-CLIENT-PORTAL.
4. **`acct_invoices` + `acct_payment_transactions` + `acct_retainer_balances`** (Aiwyn invoicing, TaxDome integrated POS via Stripe / ACH, Ignition payment automation, Canopy billing). Phase 0: invoice / payment universal; retainer balances are a CPA-specific construct (similar to but distinct from law-firm IOLTA trust accounting; some states require segregation). Recommended cluster: ACCT-TIME-BILLING.
5. **`acct_engagement_acceptance_checks` as separate module** (Karbon client acceptance, Ignition KYC). Phase 0: is this a standalone module (ACCT-INTAKE-CONFLICT mirroring LEGAL-INTAKE-CONFLICT) or a feature inside ACCT-ENGAGEMENT-LTR-MGMT? Decision is whether to add the capability + module at all. Recommended cluster: ACCT-INTAKE-CONFLICT (optional module) or fold into ACCT-ENGAGEMENT-LTR-MGMT.
6. **`acct_tax_research_queries` + `acct_tax_authority_correspondence`** (Thomson Reuters Checkpoint, Bloomberg Tax research integrations, IRS-correspondence tracking). Phase 0: are these load-bearing for the platform-buyer (i.e. are they expected in Karbon / Canopy / TaxDome) or are they tax-prep-suite features that live in the tax-prep software (UltraTax, CCH Axcess Tax)? If the latter, scope out. Recommended cluster: deferred pending Phase 0.

### Cross-bucket dependencies

- Bucket 2 item 1 (module shape) gates every Bucket 1 STRUCTURAL fix that references modules (B1-S1, B1-S5 source-module backfill semantics, B1-B1, F2, F3, E-band). User resolves Bucket 2.1 first; Bucket 1 fixes follow.
- Bucket 2 item 4 (handoff 340 payload review) gates B1-H1 row 340 (the proposed PCF tag assumes a payable-flavor interpretation; rewiring the handoff would shift the PCF cluster).
- Bucket 2 item 5 (engagement_letters master ownership) gates B1-B3 (the mirror relationship's source-side master changes if the master is split or renamed) and affects the ACCT-ENGAGEMENT-LTR-MGMT module's data_object footprint.
- Bucket 3 items 1-6 (MISSING entities) inform Bucket 2 item 1 (module shape): adopting a 6- or 7-module split changes which masters anchor which modules. Recommendation: resolve Bucket 2.1 first with the existing 2 masters; let Bucket 3 vetting drive subsequent Phase A loads.
- Bucket 2 items 2, 3, 6 are independent.

### Per-bucket prompts

**Bucket 1:** "Fix these 13 items? Bucket 1 is gated on Bucket 2 item 1 (module shape) and 2.4 (handoff 340 payload review). Reply 'after Bucket 2.1 + 2.4', 'approve all the non-gated items now' (B1-S2 / A4 wording will still need your approval per Rule #20; B1-S6 missing trigger events, B1-S7 aliases, B1-H1 APQC tag corrections are non-gated), or 'just B1-S7 + B1-H1' (aliases + APQC tag corrections only)."

**Bucket 2:** "Decisions needed on 6 items. Item 1 (module shape: 4-vs-5-vs-6-vs-7 modules; TAX-RETURNS, DEADLINE-MGMT, INTAKE-CONFLICT scope) is the structural gate; please answer first. Items 2 (catalog_tagline / description wording per Rule #20), 3 (`tax_returns` pattern flags), 4 (handoff 340 payload review), 5 (`engagement_letters` master ownership), 6 (`supplier_invoices` contributor row review) can be resolved in any order, with item 4 informing the B1-H1 row 340 fix and item 5 informing B1-B3 + ENGAGEMENT-LTR-MGMT module shape. Reply per item."

**Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which of the 6 candidate groups ring true (engagement proposals + acceptance checks + e-sign; workflow templates + tasks + capacity + tax calendar; client documents + messages; invoices + payments + retainers; intake-conflict as separate module; tax research + authority correspondence) and they'll move to Bucket 1 in the next pass."

### Report-only follow-ups (owed by other domains)

- **GRC B10b owes target-side module FK** on handoff 338 (`tax_return.filed`). GRC has 0 modules per spot-check; fix lands when GRC is modularized.
- **GRC B8** owes inbound `data_object_relationships` for the tax-filing-report payload (likely future `compliance_obligations` or `regulatory_filings` master under a GRC reporting module).
- **CLM B10b owes target-side module FK** on handoff 339 (`engagement_letter.signed`). CLM has 5 modules (the natural target is CLM-REPOSITORY id=127). Actionable today on CLM's audit; alternatively the agent can backfill from this audit since CLM is modularized.
- **CLM B8** owes inbound `data_object_relationships` mirroring the signed-letter handoff (e.g. `contracts ingests_from engagement_letters` or `contract_obligations triggered_by engagement_letter_clauses`).
- **AP-AUTO B10b owes target-side module FK** on handoff 340 (`tax_return.filed` with `supplier_invoices` payload, pending Bucket 2.4 review). AP-AUTO has 0 modules per spot-check.
- **AP-AUTO B9 / B8** is gated on Bucket 2.4 (handoff payload review).
- **LEGAL-PRACT-MGMT B9** owes outbound on `engagement_letter.signed` / `.executed` / `.terminated` to ACCT-PRACT-MGMT (mirrors handoff 339 going outbound on the LEGAL side). The current handoff 339 fires from ACCT-PRACT-MGMT but only with NULL source-module; the LEGAL-side outbound to ACCT for the same event would let both sides observe state transitions on the shared master.
- **WFM B9** owes outbound on `time_entry.submitted` / `.approved` / `.locked` to ACCT-PRACT-MGMT (time-entry rollup into engagement billing).
- **S2P B9** owes outbound on `supplier_invoice.approved` / `.paid` to ACCT-PRACT-MGMT (firm's own AP for vendor invoices; conditional on Bucket 2.6 resolving the contributor row scope).
- **CRM B9** owes outbound on `crm_contact.upserted` / `.merged` to ACCT-PRACT-MGMT (client contact master upserts feed practice management).
- **Partner-domain module sparsity (informational):** spot-checks of GRC (id=15), AP-AUTO (id=29), WFM (id=59), S2P (id=27) returned zero `domain_modules` for each. M-band hard fail on all four partners; auditing them would be a high-leverage follow-up given ACCT-PRACT-MGMT depends on three of them (LEGAL, WFM, S2P, CRM) for inbound master contributions. CLM and CRM and LEGAL-PRACT-MGMT are the modularized neighbors.

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass applied the technical-only slice of B1, deferring every item gated on Bucket 2 decisions or on M1 module authoring. Loader: `.tmp_deploy/fix_acct_pract_mgmt_b1_technical_2026_05_31.ts`. All writes succeeded; zero JWT errors.

### Applied (3 of 13 B1 items)

- **B1-B2 (B10b target side, CLM).** PATCHed `handoffs.id=339` `target_domain_module_id` from NULL to `127` (CLM-REPOSITORY). FK derivable from existing CLM modules; no judgment needed.
- **B1-S4 (B7 user-edges, Rule #10).** INSERTED 5 rows in `data_object_relationships` to `data_objects.users` (id=748, `kind=platform_builtin`). New row ids: 1662 (`tax_returns is prepared by users`), 1663 (`tax_returns is reviewed by users`), 1664 (`client_engagements is led by engagement partner users`), 1665 (`client_engagements is managed by engagement manager users`), 1666 (`client_engagements is staffed by users`, `many_to_many`). All `record_status` default `new`; first four `is_required=true`, fifth `false`.
- **B1-H1 (APQC tagging).** INSERTED 3 `handoff_processes` rows with `proposal_source='agent_curated'`, supplementing existing rows per the audit's "supplementing the existing rows" recommendation. New ids: 465 (handoff 338 -> process 328 `Process taxes`), 466 (handoff 339 -> process 807 `Manage contracts`), 467 (handoff 340 -> process 315 `Process accounts payable (AP)`). The wrong-fit existing row id=206 (`handoff 339 -> process 300`) was NOT deleted or PATCHed: the audit lists DELETE-and-replace vs. PATCH as a user-pick.

### Deferred (10 of 13 B1 items)

- **B1-S1 (M1 modules).** Gated on Bucket 2.1 (4-vs-5-vs-6-vs-7 module split is a user pick).
- **B1-S2 (A4 catalog UX).** Rule #20 requires user-approved buyer-voice wording before write.
- **B1-S3 (B6 intra-domain edge).** Audit pre-specifies one edge (`client_engagements scopes tax_returns`) but the technical filter authorizes only `users` user-edges via Rule #10, not intra-domain edges.
- **B1-S5 (B9 missing handoff or terminal-state).** Audit poses an (a)/(b) decision.
- **B1-S6 (B9 missing trigger_events).** Five new entity inserts; deferred under the new-entities filter.
- **B1-S7 (B11 aliases).** Audit lists candidate aliases but does not pre-specify exact `(data_object_id, alias_name, alias_type)` tuples per row (vendor-shape annotations such as "Karbon / Canopy / TaxDome standard" require `alias_type` and optional `solution_id` judgment).
- **B1-S8 (B12 lifecycle states).** New entity inserts gated on Bucket 2.5 confirmation and module ownership.
- **B1-S9 (F1+F3+F7 skill retire / extend).** Gated on modules.
- **B1-B1 (B10b source-side).** Gated on ACCT-PRACT-MGMT modules existing.
- **B1-B3 + B1-B4 (B8 cross-domain mirrors).** Audit notes B1-B3 depends on Bucket 2.5 (engagement_letters master ownership) and B1-B4 is deferred-pending-GRC-modularization.

### Verification

- `handoffs.id=339`: `target_domain_module_id=127`.
- `data_object_relationships` between `(400|401)` and `748`: 5 rows (ids 1662-1666).
- `handoff_processes` for handoffs 338/339/340: 6 rows total (3 prior + 3 new `agent_curated`, ids 465-467).

UI:
- https://tests.semantius.app/domain_map/handoffs
- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- **Current footprint:** still 0 `domain_modules` for `domain_id=152`. 2 masters (`tax_returns` id=400, `client_engagements` id=401), 4 contributors (`engagement_letters` id=394, `time_entries` id=162, `supplier_invoices` id=75, `crm_contacts` id=98), 6 capabilities, 8 primary solutions, 5 regulations (3 mandatory + 1 conditional + 1 recommended), 4 `business_function_domains`, 3 outbound handoffs + 0 inbound, 2 outbound `trigger_events` (event 332 `client_engagement.commenced` still has zero handoffs), 0 `data_object_lifecycle_states`, 5 user-edge `data_object_relationships` (ids 1662-1666 from the 2026-05-31 continuation), 0 intra-domain or cross-domain mirror relationships, 0 aliases on either master, 0 `domain_aliases`. Skill layer: 1 legacy `skills` row id=25 (`acct-pract-mgmt-system`, `skill_type=system`, `domain_module_id=null`) with 4 `skill_tools` (2 `query` platform, 1 `side_effect` platform `send_email`, 1 `side_effect` external `sign_document`). RBAC: 0 roles, 0 ACCT-PRACT-MGMT permissions (gated on M1). APQC: 6 `handoff_processes` rows across the 3 outbound handoffs (1 wrong-fit `agent_curated` row id=206 pointing handoff 339 -> process 300 "Evaluate and manage financial performance" still present alongside the corrected id=466 pointing to process 807 "Manage contracts"); 0 of 6 are `record_status=approved`.
- **Vendor surface basis:** same 8 flagships already loaded as `primary` (Karbon, Canopy, TaxDome, Jetpack Workflow, CCH Axcess Practice, Aiwyn, Liscio, Ignition). Specialist anchors for IRS Pub 4557 / GLBA / WISP duties are embedded across the suites, no standalone preparer-compliance vendor warrants enumeration. The Pass-2 enumeration from the 2026-05-30 audit still holds.
- **Bucket 1 (b1a + b1b agent-actionable):** 14 items pending.
- **Bucket 2 (user judgment):** 7 items.
- **Bucket 3 (Phase 0 pending):** 6 items.
- **Structural gate state:** M1 hard fail unchanged (zero `domain_modules`). M-band blocks every downstream module-scoped fix (B10b source-side, B12 lifecycle states by realizing module, F2/F3/F5 system skill per module, E-band RBAC).
- **No JWT errors during this audit.** All `semantius call crud postgrestRequest` calls returned cleanly.

### Vendor surface basis

Pass 2 enumeration unchanged from 2026-05-30: Karbon (cloud-native practice operating platform), Canopy (mid-market practice management + client portal), TaxDome (SMB end-to-end with portal + e-sign + billing), Jetpack Workflow (recurring-task templating), CCH Axcess Practice (Wolters Kluwer enterprise suite paired with tax-prep software), Aiwyn (AR + billing automation specialist), Liscio (secure client communications specialist), Ignition (engagement-letter + proposals + payment specialist). Compliance specialists embedded in the platforms rather than sold standalone.

### Bucket 1 - In-scope confirmed gaps

**Sub-categorization** (14 line items by finding type):

| finding type | count |
| --- | --- |
| MISSING (entity gap) | 0 (deferred to Bucket 3 per recipe) |
| STRUCTURAL | 9 |
| BOUNDARY | 4 |
| APQC TAGGING | 1 (retire wrong-fit row id=206) |

#### STRUCTURAL findings (b1b - blocked unless noted)

| # | id | finding | classification | blocker |
| --- | --- | --- | --- | --- |
| 1 | M1 | Zero `domain_modules` rows | b1b | Bucket 2.1 (module-shape decision) |
| 2 | A4 | `catalog_tagline` and `catalog_description` empty | b1b | Bucket 2.2 (user-approved buyer-voice wording per Rule #20) |
| 3 | B4 | `tax_returns` pattern flags all false; candidates `has_personal_content=true`, `has_submit_lock=true`, `has_single_approver=true` | b1b | Bucket 2.3 |
| 4 | B6 | Zero intra-domain `data_object_relationships`; missing edge `client_engagements scopes tax_returns` (cardinality 1:N, optional, source-master `client_engagements`) | b1a | actionable now via small INSERT |
| 5 | B9 (event 332) | `client_engagement.commenced` (event id=332) has zero handoff fan-out | b1b | M1 (intra-domain handoffs need modules) |
| 6 | B9 (missing events) | Likely-missing `tax_return.accepted_by_irs`, `tax_return.rejected_by_irs`, `tax_return.amended`, `client_engagement.completed`, `client_engagement.terminated` | b1a | actionable (5 INSERT into `trigger_events`, `event_category=lifecycle` for 4 / `state_change` for `amended`) |
| 7 | B11 | Zero aliases on both masters; candidates `tax_returns` <-> "1040" / "1120" / "1065", `client_engagements` <-> "Engagement" / "Job" / "Project" / "Matter" | b1b | Bucket 2.7 (alias_type vocabulary + per-row vendor-shape judgment) |
| 8 | B12 | Zero `data_object_lifecycle_states` on both masters; both have observable state machines | b1b | M1 + Bucket 2.3 (config-shape exemption review per Rule #12) |
| 9 | F1+F3+F7 | Legacy `acct-pract-mgmt-system` skill id=25 with `domain_module_id=null` + thin tool set (no `mutate` / `fetch` / `inbound`) + `send_email` channel-vs-capability concern | b1b | M1 |

#### BOUNDARY findings

| # | id | finding | classification | blocker |
| --- | --- | --- | --- | --- |
| 10 | B10b (outbound, source side) | All 3 outbound handoffs (338, 339, 340) still have `source_domain_module_id=NULL` | b1b | M1 |
| 11 | B10b (target side, GRC / AP-AUTO) | Handoffs 338 (-> GRC) and 340 (-> AP-AUTO) have `target_domain_module_id=NULL` | b1b | GRC + AP-AUTO modularization (both 0 modules per spot-check) |
| 12 | B8 (CLM mirror) | Missing intra-cluster mirrors `engagement_letters scopes_into client_engagements` and `client_engagements references_letter engagement_letters` | b1b | Bucket 2.5 (engagement_letters master ownership) |
| 13 | B8 (GRC mirror) | Missing `tax_returns reports_to <grc-tax-compliance-obligation>` payload edge | b1b | GRC modularization (no GRC obligations master identified yet) |

#### APQC TAGGING

| # | id | finding | classification | blocker |
| --- | --- | --- | --- | --- |
| 14 | H1 | Wrong-fit `handoff_processes` row id=206 (handoff 339 -> process 300 "Evaluate and manage financial performance", `agent_curated`, `record_status=new`) is still present alongside corrected id=466 (-> process 807 "Manage contracts"). 0 of 6 `handoff_processes` rows on ACCT-PRACT-MGMT outbound handoffs are `approved`. | b1b | Bucket 2.6 (DELETE-and-replace vs PATCH the wrong-fit row) |

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module shape confirmation (gates B1-S1, B1-S5, B1-S8, B1-S9, B1-B1, F-band, E-band).** Options unchanged from 2026-05-30: (a) 5-module split (ACCT-ENGAGEMENT-LTR-MGMT + ACCT-WORKFLOW + ACCT-TAX-RETURNS + ACCT-CLIENT-PORTAL + ACCT-TIME-BILLING); (b) 4-module split merging TAX-RETURNS into WORKFLOW; (c) 6-module split adding dedicated ACCT-DEADLINE-MGMT; (d) 7-module split adding ACCT-INTAKE-CONFLICT for AICPA-CODE independence + KYC.
2. **`catalog_tagline` and `catalog_description` wording (A4 + Rule #20).** User-authored or user-approved buyer-voice tagline + 1-3 paragraph description. Independent.
3. **`tax_returns` pattern flags (B4).** Candidates: `has_personal_content=true` (taxpayer SSN, dependents, income, account numbers), `has_submit_lock=true` (post-filing immutability; amended return is a separate workflow), `has_single_approver=true` (partner sign-off precedes filing). Decision: PATCH which of the three on id=400? Also probable: `client_engagements has_single_approver=true` (partner-led engagement acceptance). Independent.
4. **Handoff 340 payload review.** Trigger event `tax_return.filed` (on `tax_returns` id=400) but payload `supplier_invoices` (id=75). Options: (a) keep + reframe semantics; (b) rewire to a different event such as a future `tax_invoice.issued` on `acct_invoices`; (c) retarget from AP-AUTO to ERP-FIN if the intent is AR profile creation; (d) delete the handoff. Gates the B1-H1 row 340 PCF cluster choice.
5. **`engagement_letters` master ownership.** Currently mastered by LEGAL-PRACT-MGMT (id=150), ACCT-PRACT-MGMT consumes as contributor. Options: (a) leave consolidated; (b) split into `acct_engagement_letters` + `legal_engagement_letters`; (c) rename to `professional_engagement_letters` with both domains contributing. Gates B1-B3 mirror authoring and the ACCT-ENGAGEMENT-LTR-MGMT module's data_object footprint.
6. **Wrong-fit APQC tag on handoff 339 (`handoff_processes` id=206).** The existing `agent_curated` row points at process 300 "Evaluate and manage financial performance", which doesn't fit a contract-management transition. Corrected row id=466 (-> process 807 "Manage contracts") was inserted on 2026-05-31. Options: (a) DELETE id=206 (drop the wrong row entirely); (b) PATCH id=206 `process_id` from 300 to 807 (collapses the duplicate with id=466, requires DELETE of id=466); (c) leave both rows present and mark id=206 `record_status='rejected'`. Independent.
7. **`supplier_invoices` contributor row review (id=75).** The contributor role on S2P-mastered supplier invoices needs clarification: (a) firm's own AP (firm pays vendors); (b) client-side supplier invoices the firm processes as bookkeeper; (c) erroneous (delete the contributor row). Independent.

### Bucket 3 - Phase 0 pending (speculative)

Unchanged from 2026-05-30 enumeration; six candidate groups:

1. **`acct_engagement_proposals` + `acct_engagement_acceptance_checks` + `acct_e_signature_envelopes`** - vendor evidence: Karbon proposals, Ignition proposals + KYC, TaxDome e-sign, Canopy e-sign. Recommended cluster: ACCT-ENGAGEMENT-LTR-MGMT.
2. **`acct_workflow_templates` + `acct_workflow_tasks` + `acct_capacity_forecasts` + `acct_tax_calendar_deadlines`** - Karbon templates, Jetpack Workflow recurring rules, CCH Axcess Practice tax-calendar engine, Canopy templates. Cluster: ACCT-WORKFLOW (+ ACCT-DEADLINE-MGMT if split per Bucket 2.1).
3. **`acct_client_documents` + `acct_client_messages`** - TaxDome client portal vault, Liscio secure messaging, Canopy file shares. Cluster: ACCT-CLIENT-PORTAL.
4. **`acct_invoices` + `acct_payment_transactions` + `acct_retainer_balances`** - Aiwyn invoicing, TaxDome integrated POS, Ignition payment automation, Canopy billing. Cluster: ACCT-TIME-BILLING.
5. **`acct_engagement_acceptance_checks` as separate module** - Karbon client acceptance, Ignition KYC. Decision: standalone ACCT-INTAKE-CONFLICT module vs feature inside ACCT-ENGAGEMENT-LTR-MGMT.
6. **`acct_tax_research_queries` + `acct_tax_authority_correspondence`** - Thomson Reuters Checkpoint, Bloomberg Tax research integrations, IRS-correspondence tracking. Decision: load-bearing for the practice-management buyer or scoped to the tax-prep software (UltraTax, CCH Axcess Tax)?

### Cross-bucket dependencies

- Bucket 2.1 (module shape) gates B1-S1, B1-S5, B1-S8 realizing-module assignments, B1-S9, B1-B1, F-band, E-band.
- Bucket 2.3 (`tax_returns` + `client_engagements` pattern flags) gates B1-S8 lifecycle authoring (per Rule #12 the flag + lifecycle pass is one motion).
- Bucket 2.4 (handoff 340 payload) gates the right PCF cluster for handoff 340 and may also delete handoff 340 outright.
- Bucket 2.5 (engagement_letters master ownership) gates B1-B3 (CLM mirror) and the ACCT-ENGAGEMENT-LTR-MGMT module's data_object roster.
- Bucket 2.6 (wrong-fit row id=206) is independent.
- Bucket 3 informs Bucket 2.1 (a 6- or 7-module split changes which masters anchor which modules).

### Report-only follow-ups owed by other domains

- **GRC** owes outbound on a future `compliance_obligations` (or similar) master + module + handoff to receive the `tax_return.filed` signal as a regulatory-evidence consumer.
- **AP-AUTO** is gated on Bucket 2.4 (if handoff 340 stays, AP-AUTO module FK backfill + mirror relationship needed).
- **LEGAL-PRACT-MGMT** owes outbound on `engagement_letter.signed` / `.executed` / `.terminated` once both LEGAL-PRACT-MGMT and ACCT-PRACT-MGMT are modularized.
- **WFM** owes outbound on `time_entry.submitted` / `.approved` / `.locked` for the engagement-billing rollup once WFM is modularized.
- **S2P** owes outbound on `supplier_invoice.approved` / `.paid` (conditional on Bucket 2.7 resolving the contributor row scope).
- **CRM** owes outbound on `crm_contact.upserted` / `.merged` for the client-contact master upsert.
- **Partner-domain module sparsity:** GRC (id=15), AP-AUTO (id=29), WFM (id=59), S2P (id=27) still 0 modules per spot-check. ACCT-PRACT-MGMT depends on three of those (WFM, S2P + CRM, LEGAL-PRACT-MGMT) for inbound master contributions. CLM (5 modules), CRM (5 modules), LEGAL-PRACT-MGMT (5 modules) are the modularized neighbors.

### Fixes applied during this audit

None. This is a structural audit pass only; no writes were issued. The 2 b1a items above (B1-#4 intra-domain edge, B1-#6 new trigger events) are ready to load on the next agent pass if the user approves, but were not applied during the audit itself.

UI for spot-check (unchanged):
- https://tests.semantius.app/domain_map/handoffs
- https://tests.semantius.app/domain_map/handoff_processes
- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/domains

## 2026-06-02 Audit (modularization)

### Summary

M1 hard fail cured. ACCT-PRACT-MGMT (domain_id=152) went from 0 `domain_modules` to 3 `module_kind='full'` modules. Scope of this pass was modules + entity assignment ONLY: linked the 6 existing capabilities into modules, assigned the 6 existing `domain_data_objects` (2 master + 4 contributor) at their existing role + necessity. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. Loader: `.tmp_deploy/modularize_acct_pract_mgmt_2026-06-02.ts` (idempotent; re-run is a no-op). All `semantius call crud postgrestRequest` calls returned cleanly; zero JWT errors.

The prior audit's Pass-2 5-to-7-module proposal assumed new masters (acct_engagement_proposals, acct_workflow_templates / tasks, acct_client_documents / messages, acct_invoices / payment_transactions / retainer_balances, etc.) that remain Bucket 3 / Phase 0 candidates. Those entities are out of scope for a reuse-only modularization, so the practical Rule #14 floor with only the 6 existing data_objects is a 3-module split that keeps each capability placed, each master single-mastered, and no module empty. When the Bucket 3 entities land via a future Phase A/B pass, the 3 modules can be split further toward the 5-to-7 shape (notably carving ACCT-TAX-RETURNS out of TAX-RETURN-PREP, ACCT-ENGAGEMENT-LTR-MGMT out of ENGAGEMENT-WORKFLOW, and ACCT-CLIENT-PORTAL out of CLIENT-PORTAL-BILLING).

### Module split

| module (code, id) | capabilities | data_objects (role, necessity) |
| --- | --- | --- |
| ACCT-PRACT-MGMT-ENGAGEMENT-WORKFLOW (id=207) | ACCT-WORKFLOW (434), ACCT-DEADLINE-MGMT (438), ACCT-ENGAGEMENT-LTR (437) | client_engagements (401, **master**, required); engagement_letters (394, contributor, required; LEGAL-PRACT-MGMT-mastered); crm_contacts (98, contributor, required; CRM-mastered) |
| ACCT-PRACT-MGMT-TAX-RETURN-PREP (id=208) | ACCT-DOC-MGMT (439) | tax_returns (400, **master**, required); supplier_invoices (75, contributor, required; S2P-mastered) |
| ACCT-PRACT-MGMT-CLIENT-PORTAL-BILLING (id=209) | ACCT-CLIENT-PORTAL (435), ACCT-TIME-BILLING (436) | time_entries (162, contributor, required; WFM-mastered) |

### Counts

- domain_modules inserted: 3 (all `module_kind='full'`, `record_status='new'`, `catalog_tagline=''`, `catalog_description=''`).
- domain_module_capabilities inserted: 6 (all 6 domain capabilities placed in exactly one module; M4 satisfied).
- domain_module_data_objects inserted: 6 (matches the 6 `domain_data_objects` rows 1:1; roles + necessity preserved verbatim).
- Masters: tax_returns (400) and client_engagements (401), each master in exactly one module (M7 single-master satisfied).
- Empty modules: 0 (every module has >=1 capability and >=1 data_object; M6 satisfied).
- Rule #14: 6 capabilities -> >=2 full modules required; 3 delivered. PASS.

### Verification (live re-query)

- `/domain_modules?domain_id=eq.152`: 3 rows, ids 207-209, all full, all `record_status='new'`.
- DMC rows: 6; capabilities placed 6/6 (434, 435, 436, 437, 438, 439).
- DMDO rows: 6; master 400 in 1 module, master 401 in 1 module; no empty module.
- Idempotent re-run: second run inserted nothing.

### Deferred gaps (owed but out of this pass's scope)

- **Per-module system skills (Rule #17 -> F2/F3).** Each of the 3 new modules now owes exactly one `system` skill with `domain_module_id` set, and the legacy `acct-pract-mgmt-system` skill id=25 (`domain_module_id=null`) needs retire-and-split with its 4-tool surface redistributed and extended (no `mutate`/`fetch`/`inbound` today; `send_email` -> `notify_person` per F7). Now agent-actionable since modules exist (state.yaml `b1a` B1A-MODULE-SKILLS).
- **Catalog UX backfill (M8/A4, Rule #20).** All 3 modules ship empty `catalog_tagline` / `catalog_description`, plus the domain-level pair on domains.id=152 is still empty. Buyer-voice wording needs user authoring/approval (state.yaml b1a B1A-MODULE-SKILLS notes the per-module copy; the domain-level copy stays Bucket 2 / b1b under Rule #20).
- **Missing-master candidates (now agent-flaggable as b3).** The reuse-only split leaves TAX-RETURN-PREP, ENGAGEMENT-WORKFLOW and CLIENT-PORTAL-BILLING coarser than the eventual target shape because the per-capability masters do not exist yet: acct_workflow_templates / acct_workflow_tasks / acct_capacity_forecasts / acct_tax_calendar_deadlines (ACCT-WORKFLOW + ACCT-DEADLINE-MGMT), acct_engagement_proposals / acct_e_signature_envelopes (ACCT-ENGAGEMENT-LTR), acct_client_documents / acct_client_messages (ACCT-CLIENT-PORTAL + ACCT-DOC-MGMT), acct_invoices / acct_payment_transactions / acct_retainer_balances (ACCT-TIME-BILLING). Until they exist, ACCT-DOC-MGMT, ACCT-CLIENT-PORTAL and ACCT-TIME-BILLING are realized only by contributor data_objects, not by a domain-owned master.
- **Module-scoped backfills now unblocked by M1 cure (were b1b-on-M1).** B10b source-side FK on handoffs 338/339/340 (338 + 340 from ACCT-PRACT-MGMT-TAX-RETURN-PREP id=208 since tax_returns masters there; 339 from ACCT-PRACT-MGMT-ENGAGEMENT-WORKFLOW id=207 since engagement_letters lives there); event-332 intra-domain fan-out; B12 lifecycle-state realizing-module assignment. These remain deferred to the next Validate pass (this pass was modules + entity assignment only) but their M1 blocker is resolved.

UI for spot-check:
- https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.152
- https://tests.semantius.app/domain_map/domain_module_capabilities
- https://tests.semantius.app/domain_map/domain_module_data_objects

## 2026-06-05 — b1a execution

Agent pass executed the 3 agent-solvable b1a items. All `semantius call crud postgrestRequest` calls returned cleanly; zero JWT errors. `record_status` omitted on every insert (DB default `new`). No `notes`, `catalog_tagline`, or `catalog_description` written.

### B1A-B6-INTRA-EDGE — DONE

INSERTED 1 row into `data_object_relationships` (id=**2015**):
- `client_engagements scopes tax_returns`: `data_object_id=401`, `related_data_object_id=400`, `relationship_verb='scopes'`, `inverse_verb='is scoped by'`, `relationship_type='one_to_many'`, `relationship_kind='reference'`, `is_required=false`, `owner_side='source'` (the engagement is the "one"/parent scoping many returns), `record_status='new'`.

Verification: the intra-domain edge set between masters (400, 401) is now 1 row (was 0). B6 cured for the two-master domain.

### B1A-B9-MISSING-EVENTS — DONE

INSERTED 5 rows into `trigger_events` (ids **1493–1497**), all `record_status='new'`, `domain_module_id=NULL` (matching the established pattern on prior rows 331/332; the b1a action specified only `event_name` / `event_category` / `data_object_id`):

| id | event_name | data_object_id | event_category | from_state | to_state |
| --- | --- | --- | --- | --- | --- |
| 1493 | tax_return.accepted_by_irs | 400 | lifecycle | filed | accepted_by_irs |
| 1494 | tax_return.rejected_by_irs | 400 | lifecycle | filed | rejected_by_irs |
| 1495 | tax_return.amended | 400 | state_change | accepted_by_irs | amended |
| 1496 | client_engagement.completed | 401 | lifecycle | active | completed |
| 1497 | client_engagement.terminated | 401 | lifecycle | active | terminated |

Verification: `trigger_events` on masters (400, 401) is now 7 rows (was 2). Categories: 6 lifecycle + 1 state_change.

### B1A-MODULE-SKILLS — DONE

Loader: `.tmp_deploy/fix_acct_pract_mgmt_module_skills_2026_06_05.ts` (idempotent; re-run is a no-op). Authored one `skill_type='system'` skill per module (Rule #17 / F2), distributed and extended the tool surface (mutate + fetch + inbound + notify_person), and retired the legacy domain-level skill.

**Tools created** (3 rows into `tools`, domain-specific to the masters / external fetch; deduped by `tool_name`, `record_status='new'`, `coverage_tier` as noted):
- id=**1588** `update_tax_return` — `mutate`, `data_object_id=400`, `coverage_tier='platform'`.
- id=**1589** `update_client_engagement` — `mutate`, `data_object_id=401`, `coverage_tier='platform'`.
- id=**1590** `fetch_irs_acceptance_status` — `fetch`, `data_object_id=NULL`, `coverage_tier='external'`.

**Tools reused** (catalog-wide shared rows, NOT recreated): `query_tax_returns`(287), `query_client_engagements`(288), `query_time_entries`(780), `notify_person`(913, platform), `receive_webhook`(896, inbound platform), `sign_document`(42, external).

**System skills created** (3 rows into `skills`, `skill_type='system'`, `domain_id=152`, `domain_module_id` set, `record_status='new'`):
- id=**264** `acct_pract_mgmt_engagement_workflow_agent` — module 207.
- id=**265** `acct_pract_mgmt_tax_return_prep_agent` — module 208.
- id=**266** `acct_pract_mgmt_client_portal_billing_agent` — module 209.

**skill_tools links inserted** (10 rows, `record_status='new'`, `notes=''` per Rule #15):
- Skill 264 (module 207, masters client_engagements 401): `query_client_engagements`(288, required), `update_client_engagement`(1589, required), `notify_person`(913, optional).
- Skill 265 (module 208, masters tax_returns 400): `query_tax_returns`(287, required), `update_tax_return`(1588, required), `sign_document`(42, required — e-signature IS the workflow per F7), `fetch_irs_acceptance_status`(1590, optional), `receive_webhook`(896, optional).
- Skill 266 (module 209, carries time_entries 162 contributor): `query_time_entries`(780, required), `notify_person`(913, optional).

Per the F7 / channel-vs-capability rule, generic client notifications use the `notify_person` abstraction (not the legacy `send_email` channel primitive). `sign_document` was kept as a direct channel primitive because e-signature is the workflow (envelope-completion contract).

**Legacy skill retired (DELETE) — prior values snapshotted for reversibility:**
- DELETED `skills` id=**25**: `skill_name='acct-pract-mgmt-system'`, `skill_type='system'`, `domain_id=152`, `domain_module_id=NULL`, `description='System skill for Accounting Practice Management — runtime workflows over the domain's master data, derived from masters + cross-domain handoffs.'`, `record_status='new'`.
- DELETED its 4 `skill_tools` rows (cascade-eligible, deleted explicitly first):
  - id=318 → tool 287 `query_tax_returns` (required)
  - id=319 → tool 288 `query_client_engagements` (required)
  - id=320 → tool 37 `send_email` (side_effect, platform) (required)
  - id=321 → tool 42 `sign_document` (side_effect, external) (required)
- No `tools` rows were deleted (the catalog-wide `tools` table is shared; only the legacy skill's junction links were removed). Tools 287, 288, 42 are re-linked from the new module skills; tool 37 `send_email` is no longer linked from this domain (superseded by `notify_person`).

### Verification (live re-query)

- `/skills?domain_id=eq.152&skill_type=eq.system`: 3 rows (264/207, 265/208, 266/209); zero `domain_module_id=NULL` rows. F1/F2 clean (exactly one system skill per module).
- `/skills?id=eq.25`: empty (legacy retired).
- `/skill_tools?skill_id=in.(264,265,266)`: 10 rows; every `query`/`mutate` tool has `data_object_id` set, every `fetch`/`side_effect` tool has NULL, `inbound` NULL allowed. F3/F4 clean.
- `/trigger_events?data_object_id=in.(400,401)`: 7 rows.
- `/data_object_relationships` between (400,401): 1 row (id=2015).

### Left OPEN / not executed (per task guardrails)

- Catalog UX copy (`catalog_tagline` / `catalog_description`) on the 3 modules (207/208/209) and on `domains.id=152` was NOT written (Rule #20 — user decision B2-CATALOG-WORDING). Draft proposals surfaced in the agent report for user approval; the b1b row `B1B-A4-CATALOG-UX` stays open.

UI for spot-check:
- https://tests.semantius.app/domain_map/skills
- https://tests.semantius.app/domain_map/tools
- https://tests.semantius.app/domain_map/skill_tools
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/data_object_relationships

### 2026-06-05 catalog UX written (supersedes the "drafted, left open" note above)

The empty `catalog_tagline` / `catalog_description` on the ACCT-PRACT-MGMT domain row and modules 207, 208, 209 were WRITTEN (not parked). Loader: `.tmp_deploy/backfill_catalog_ux_2026_06_05.ts` (empty-guard: only empty fields written, no overwrite). record_status on these rows is `new`, so the copy is reviewed in-record per the revised Rule #20. The prior note in this date section that left the UX "open" is superseded; the UX-only state.yaml items were removed.
