# LSD audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: **8 master data_objects + 1 legacy consumer rollup row** (`legal_contracts`), **0 `domain_modules` rows** (primary host = 0; cross-cutting host junctions = 0), 2 capabilities (KNOWLEDGE-MGMT, SELF-SERVICE-PORTAL), 5 solutions (all `coverage_level=primary`), 2 regulations (EIDAS, EU-WHISTLE), 2 business-function-domains rows (Legal owner + IT Operations contributor), 12 trigger events on LSD masters, **11 outbound + 3 inbound cross-domain handoffs** (14 total cross-domain), 0 intra-domain handoffs, 16 aliases on 8 masters, 0 lifecycle states across every master, 0 handoff_processes (APQC) rows, 0 LSD-anchored roles, 0 LSD-anchored role_modules, 1 legacy domain-level `system` skill (`lsd-system`, kebab + system suffix), 10 skill_tools on that legacy skill.
- Vendor-surface basis (flagship vendors enumerated): **ServiceNow Legal Service Delivery** (LSD-anchor for in-house legal workflows, intake-portal-led), **LawVu** (in-house legal platform, matter + intake + contract registry), **Onit Enterprise Legal Management** (intake, matter, e-billing, workflow), **Litera** (matter-doc productivity, drafting, comparison), **iManage Cloud** (legal-shaped document and matter management). All five are pure-play or legal-vertical specialists. ServiceNow LSD and LawVu anchor the intake-portal motion; Onit anchors the matter-spend leg; Litera and iManage anchor the document leg.
- **Bucket 1 (in-scope, agent fixable):** 10 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.
- **Candidates queued to `audits/_missing-domains.md`:** 1 (ELM, Enterprise Legal Management).

**Headline structural verdict.** LSD is in a pre-modular legacy shape: the `domains` row, 8 mastered data_objects, capability links, regulations, business-function links, trigger events, B6 + B7 + B8 relationships, aliases, the legacy `domain_data_objects` rollup, an outbound + inbound handoff set, and a domain-anchored `system` skill all exist, but **not a single `domain_modules` row exists** for LSD. That single fact cascades into M1, M2, M4, M6 hard fails, B10b 100%-null on every LSD-side handoff, B12 deferred (no module to host states), F1 + F2 fail (legacy `lsd-system` skill present, zero module-level system skills), E1 vacuously passes only because the 2-module floor blocks roles. The fix sequence is forced: **modularize LSD first (B1-M1 below)**, then everything else lands cleanly. No B-band, C-band, E-band, F-band, or H-band can be properly cured until the module set is loaded.

**Catalog quality (H-band headline):** 0 of 14 cross-domain handoffs carry an approved `handoff_processes` tag (0%). **Process health (side-bar):** 0 `agent_curated` proposals on the catalog today; this audit proposes 11 new `agent_curated` rows in Bucket 1 (H1) below (3 of the 14 deferred to Discover Pass 3 per the no-clean-PCF-match rule).

### Vendor surface basis

In-house legal service delivery is the buyer-shaped market: the **legal department as an internal service provider**, with intake from business units, matter triage, work routing, legal-hold and ediscovery orchestration, regulatory-inquiry response, outside-counsel engagement, and an in-house knowledge surface. Pure-play specialists were preferred over diversified suites:

- **ServiceNow Legal Service Delivery**: the LSD-named anchor; intake portal + service catalog + matter routing on the Now Platform.
- **LawVu**: the in-house legal operating platform; matter + intake + contracts + outside counsel in one tool.
- **Onit Enterprise Legal Management**: intake, matter management, workflow, e-billing; positioned between LSD and ELM.
- **Litera**: drafting and matter productivity; intersects with LSD on advice memos, engagement letters, matter doc workspaces.
- **iManage Cloud**: legal document and matter workspace; LSD's authoritative document surface in many in-house deployments.

The regulated leg is anchored by EIDAS (trust-services / qualified electronic signatures on legal correspondence) and EU-WHISTLE (whistleblower-protection intake routing). FCRA, HIPAA, GDPR show up only adjacently (HCM-side legal advice on employee matters; data_subject_requests fall to DPIA / RecordsRequest workflows, mastered elsewhere).

### Pass 1, Structural (per-domain completeness checklist) findings

**S-band sweep (coverage).**

| Band | Pass / fail | Note |
|---|---|---|
| S1 (`domains` direct FK coverage) | partial | `domain_modules`, `domain_module_data_objects`, `domain_module_host_domains` = 0; `domain_data_objects` populated but legacy-only; `solution_domains`, `capability_domains`, `domain_regulations`, `business_function_domains`, `handoffs.source_domain_id`, `handoffs.target_domain_id`, `skills` non-zero. **Zero-row anomaly on `domain_modules` routes to M1.** |
| S2 (per-module indirect-table coverage) | n/a (no modules to count) | Routes to M1. |
| S3 (per-master indirect-table coverage) | partial | All 8 masters: 0 lifecycle states, 12 trigger events shared across 7 of 8 masters (`outside_counsel_engagements` has 1 trigger; `legal_case_dockets` has 1; `legal_intake_requests` has 1; rest have 1-3 each). Aliases: 16 rows across all 8 masters, well-covered. **Zero-state on every master routes to B12.** |

**A-band (Phase A).**

| ID | Result | Detail |
|---|---|---|
| A1 (domains metadata) | pass | `crud_percentage=95`, `min_org_size='30 m <2500'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=1200`, `market_size_source_year=2025`. `business_logic=''` is acceptable because `crud_percentage >= 95`. |
| A2 (capabilities) | partial | 2 capability_domains rows (KNOWLEDGE-MGMT, SELF-SERVICE-PORTAL), below the typical 5-8 floor. Both are cross-cutting capabilities also realized in ITSM, HRSD, CSM. Neither has a realizing LSD module (M4 fail). **Likely under-counted because the LSD-specific capability set (matter triage, legal intake, legal hold, ediscovery, outside-counsel routing, knowledge management for legal) was not authored at load time.** |
| A3 (solutions) | pass | 5 solutions, all `primary`. ServiceNow LSD + LawVu + iManage + Litera + Onit ELM. |
| A4 (catalog UX) | fail | `catalog_tagline=''`, `catalog_description=''`. |

**M-band (Phase M).** **All hard fails. Modularization is the blocking structural gate for this audit.**

| ID | Result | Detail |
|---|---|---|
| M1 (>=1 `domain_modules` row) | fail | Zero `domain_modules` rows on `domain_id=25`; zero cross-cutting hosts via `domain_module_host_domains`. |
| M2 (>=2 modules when capabilities >=3) | vacuously passes (cap_count=2) but practically fails | The capability count is artificially low (A2). The market clearly has >=3 capabilities; once A2 is cured, M2 needs >=2 modules. |
| M4 (every capability has >=1 realizing module) | fail | KNOWLEDGE-MGMT and SELF-SERVICE-PORTAL have realizing modules in ITSM / HRSD / CSM, but none on LSD. After M1 + A2 are cured, LSD's own modules must realize them. |
| M5 (workflow-gate states have `domain_module_id`) | vacuously passes | No lifecycle states exist at all. Routes to B12. |
| M6 (every module realizes >=1 capability) | vacuously passes | No modules exist to check. |
| M7 (single-master integrity) | pass | 8 masters; each has exactly one `domain_data_objects.role='master'` row; no within-domain master/consumer conflicts. The future LSD `domain_module_data_objects` master rows will need to preserve this. |

**B-band (Phase B).**

| ID | Result | Detail |
|---|---|---|
| B1 (>=1 master) | pass | 8 masters: `in_house_legal_matters`, `legal_intake_requests`, `legal_holds`, `ediscovery_requests`, `outside_counsel_engagements`, `legal_advice_records`, `regulatory_inquiries`, `legal_case_dockets`. |
| B2 (singular_label + plural_label) | pass | All 8 masters have both labels populated. |
| B3 (naming arbitration) | pass | All 8 masters use the prefixed form (`legal_*`, `in_house_legal_*`, `outside_counsel_*`, `regulatory_*`, `ediscovery_*`); zero canonical-bare-word claims required. |
| B4 (pattern flags considered) | partial | All 8 masters have all three flags = false. **The flags need positive consideration** (see Bucket 2): `legal_advice_records` plausibly has `has_personal_content=true` (privileged content); `legal_holds` plausibly has `has_submit_lock=true` once issued; `outside_counsel_engagements` plausibly has `has_single_approver=true` (GC sign-off). Surface for user decision. |
| B5 (embedded_master integrity) | pass | No `embedded_master` rows on LSD's side (LSD's only non-master rollup is `legal_contracts` as `consumer`; the canonical owner is CLM-REPOSITORY, valid). |
| B6 (intra-domain relationships) | pass | 9 verbed edges between LSD masters (rows 358-366): `legal_intake_requests opens in_house_legal_matters`; `in_house_legal_matters engages outside_counsel_engagements`, `produces legal_advice_records`, `tracks legal_case_dockets`, `places legal_holds`, `spawns ediscovery_requests`, `responds_to regulatory_inquiries`, `references legal_contracts`; `legal_holds preserves ediscovery_requests`. |
| B7 (users edges) | pass | 8 user edges authored (rows 367-374): `users` submits intake / leads matter / authored advice / owns docket / issued hold / runs discovery / approves engagement / responds to inquiry. |
| B8 (outbound cross-domain relationships) | pass | Cross-domain relationship rows present: matters trigger compliance_obligations (GRC), regulatory_inquiries trigger audit_engagements (AUDIT), legal_holds evidence audit_engagements, matters share_outcome_with audit_engagements, legal_holds identify_custodians_from employees (HCM), legal_advice_records reference employees, legal_holds freeze content_documents (ECM), ediscovery_requests collect_from content_documents, matters provision document_folders (ECM), legal_advice_records files_to / is_filed_in content_documents (ECM). |
| B9 (outbound trigger_events + handoffs) | partial | 12 trigger_events on LSD masters; 11 outbound handoffs. `legal_case_docket.updated` (event 1047) has zero subscribers (potential leaf); `legal_intake.submitted` (event 1041) has zero outbound handoffs (correct as intake creates the matter, no cross-domain emission until matter.opened). `outside_counsel.engaged` (event 1045) has zero subscribers (likely real B9 gap to S2P / CLM / SPEND-MGMT). **All 12 trigger_events have `event_category=''` (empty string); should be `lifecycle` or `state_change` per the catalog enum.** |
| B9b (intra-domain cross-module handoffs) | n/a | Skipped: no modules to derive pairs from. Will become applicable once M1 is cured. |
| B10 (inbound handoffs, REPORT ONLY) | partial | 3 inbound rows from RE-PROP-MGMT (`property_tenant.evicted` on `property_tenants`), HCMS (`editorial_workflow.review_required` on `editorial_workflows`), ECM (`legal_hold.placed` on `content_documents`). All three are observation-only; the RE-PROP-MGMT and HCMS inbounds look suspicious (see Bucket 2). |
| B10b (per-module attribution on handoffs) | fail | **All 14 cross-domain handoffs touching LSD have `source_domain_module_id=NULL` AND `target_domain_module_id=NULL`**, because LSD has zero modules. This cascades from M1: every LSD-side null gets cured once the M1 fix lands and the deterministic backfill rule maps each handoff's data_object_id to the realizing LSD module. |
| B11 (aliases) | pass | 16 alias rows across all 8 masters. |
| B12 (lifecycle states + pattern flags) | fail | **Zero `data_object_lifecycle_states` rows for any of the 8 LSD masters.** Every workflow-bearing master needs a state machine; none are exempt as config-shaped (matters / holds / requests / advice records all carry observable transitions: open -> active -> closed for matters; submitted -> triaged -> routed for intake; issued -> acknowledged -> released for holds; created -> collecting -> processing -> produced -> closed for ediscovery; etc.). |

**C-band (Phase C).**

| ID | Result | Detail |
|---|---|---|
| C1 (>=1 owner business_function_domains) | pass | Legal as `owner`, IT Operations as `contributor`. |
| C2 (capability function overrides) | n/a | Both LSD capabilities (KNOWLEDGE-MGMT, SELF-SERVICE-PORTAL) are cross-cutting; whether they need function-level overrides depends on which LSD module hosts them once M1 cures. |

**D-band.**

| ID | Result | Detail |
|---|---|---|
| D1 (UI spot-check) | deferred | The LSD page would render empty for modules; spot-check after M1 fix. |

**E-band (Phase E).**

| ID | Result | Detail |
|---|---|---|
| E1 (role coverage) | vacuously passes (0 modules) but underlying gap | The 5 legal roles (LEGAL-COUNSEL 10085, LEGAL-ATTORNEY 10093, LEGAL-PARALEGAL 10094, LEGAL-CONFLICTS-PARTNER 10096, LEGAL-OFFICE-MGR 10097) are all bound to LEGAL-PRACT-MGMT / CLM modules, not LSD. Once LSD modules exist, an LSD-anchored persona set (LEGAL-OPS-MGR or IN-HOUSE-COUNSEL for matters/advice/holds; LEGAL-INTAKE-COORDINATOR for the intake portal; perhaps LITIGATION-PARALEGAL for ediscovery/case-dockets) needs to be authored. |
| E2 (2-module floor on role_modules) | n/a | No LSD-anchored roles. |
| E3 (`interaction_level` set) | n/a | No LSD-anchored role_modules. |
| E4 (non-empty role_permissions bundle) | n/a | No LSD-anchored roles. |
| E5 (Path A / Path B agreement) | n/a | No LSD-anchored roles. |
| E6 (permission-bundle drift) | n/a | No LSD-anchored permissions. |

**F-band (Phase F).**

| ID | Result | Detail |
|---|---|---|
| F1 (no legacy domain-level system skills once module-level exist) | partial | Skill row 82 `lsd-system` (`skill_type='system'`, `domain_id=25`, `domain_module_id=null`) is the legacy domain-level skill. It is the **only** system skill for LSD because no module-level skills can exist before M1 lands. Once LSD is modularized and per-module `<module_code_lower>_agent` skills are authored, this row must be retired. |
| F2 (exactly one `system` skill per `domain_modules` row) | fail | Zero `domain_modules` rows; zero module-anchored system skills. After M1 cures, every new module needs its system skill. |
| F3 (each system skill has >=1 `skill_tools`) | partial | Legacy skill 82 has 10 `skill_tools` rows (8 query tools, 1 send_email, 1 sign_document). |
| F4 (`operation_kind` vs. `data_object_id` invariant) | pass | 8 `query_*` tools each carry a valid `data_object_id`; `send_email` and `sign_document` are `side_effect` with `data_object_id=null`. Pairing is correct. |
| F5 (Semantius score computable) | pass for legacy skill | Strict: 9 of 10 tools at `platform` (`sign_document` is `external`) = 90%. Operational: 9 of 10 = 90%. Reported against the legacy domain-level skill; the per-module score will need to be re-derived after M1 cures. |
| F7 (channels only when workflow requires) | partial | `send_email` (id 37, platform) is bound on the legacy skill; absent skill_tools notes (Rule #15 forbids drafting them). The intent is likely substitutable notification, so the row should be `notify_person` once skill-tools are re-authored on the per-module skills. Defer to Phase-S re-authoring after M1. |

**H-band (Phase H, APQC coverage).**

| ID | Result | Detail |
|---|---|---|
| H1 (every cross-domain handoff has a tag or deferred entry) | fail | **0 of 14 cross-domain handoffs (11 outbound + 3 inbound) carry a `handoff_processes` row.** Catalog quality (approved count) = 0/14 = 0%. Process health (agent_curated count) = 0. This audit's Bucket 1 H1 section proposes 11 new `agent_curated` tags + 3 defer-to-Discover entries. |

### Pass 2, Market audit (semantic) findings

**MISSING (workflow substrate gaps the flagship vendors carry but LSD doesn't).**

- `matter_assignments`: recruiter-style assignment of a matter to a primary attorney + collaborators (LawVu, Onit). Currently the assignee FK lives implicitly via `users leads matter`; a typed assignment row is needed for hand-offs and load balancing.
- `legal_intake_triage_decisions`: typed disposition of an intake (approve as matter, reject with reason, route to outside counsel, fold into existing matter). Currently implicit on the intake row; vendors carry it as a distinct row. **Surface to user; possibly a state-on-intake instead of a separate entity.**
- `engagement_letters`: distinct from `outside_counsel_engagements` (the relationship) and from `legal_contracts` (the executed contract). The engagement letter is the pre-engagement deliverable signed by both sides; Litera + Onit + LawVu all carry this distinctly. **Bucket 3.**
- `legal_spend_invoices`: outside-counsel invoices in LEDES format. **This is the strongest signal toward queueing ELM as a separate domain** (queued). Whether LSD should consume invoices or hand them entirely to ELM is a Bucket 2 boundary call.
- `legal_matter_budgets`: pre-engagement budget envelope per matter. **Bucket 3 / ELM-scoped.**
- `regulatory_inquiry_responses`: typed response packages (interrogatory answer set, document production, witness statement). Currently the response is implicit on `regulatory_inquiries`; separating allows multi-response matter chains. **Bucket 3.**
- `legal_knowledge_articles`: KNOWLEDGE-MGMT capability is linked but no LSD-specific knowledge data_object exists; either fold into the cross-cutting `knowledge_articles` master (ITSM-KNOWLEDGE) as a `consumer` row, or master a legal-scoped one. **Bucket 2.**

**WRONG-OWNERSHIP**: none identified (every LSD master is in its right scope on the legacy `domain_data_objects` rollup).

**SCOPE-CREEP.**

- `legal_contracts` (id 66, mastered by CLM-REPOSITORY) sits as a `consumer + required` on LSD's legacy `domain_data_objects` rollup. This is acceptable because LSD matters reference contracts. The `required` necessity could become `optional` under Rule #16 (CLM is not infrastructure but contracts can be locally embedded shells for matter-doc productivity). **Surface to user (Bucket 2).**
- The 2 cross-cutting capability links (KNOWLEDGE-MGMT, SELF-SERVICE-PORTAL) are legitimate cross-cutting capabilities under the convention; not scope creep but **realizing modules need to be added on the LSD side after M1**.

**MODULARIZATION-ISSUE.** **Major.** LSD's market shape (per vendors) clusters cleanly into 4-5 modules:

1. **LSD-INTAKE-PORTAL** (intake + triage + service-catalog routing): masters `legal_intake_requests`; realizes SELF-SERVICE-PORTAL.
2. **LSD-MATTER-MGMT** (in-house matter intake-to-close): masters `in_house_legal_matters`, `legal_case_dockets`, `legal_advice_records`; embedded_master on `legal_contracts` (from CLM). This is the LSD center of gravity.
3. **LSD-LEGAL-HOLD** (legal hold + ediscovery custodian orchestration): masters `legal_holds`, `ediscovery_requests`. Often shipped as its own module by vendors (Onna, Exterro, Zapproved as full standalone domains; in-house LSD ships this leg alongside matter management).
4. **LSD-OUTSIDE-COUNSEL** (engagement, scope, accruals, light spend tracking): masters `outside_counsel_engagements`. The deep spend leg routes to ELM.
5. **LSD-REGULATORY-RESPONSE** (regulator inquiries, subpoenas, agency responses): masters `regulatory_inquiries`. Adjacent to GRC and AUDIT but distinctly an in-house legal workflow.
6. **LSD-KNOWLEDGE** (legal knowledge management; either consumer of cross-cutting knowledge_articles or master of legal-scoped variant): realizes KNOWLEDGE-MGMT.

This module set covers all 8 existing masters + the 2 capability links + the future legal-knowledge surface. With 4+ proper capabilities the M2 (>=2 modules when >=3 capabilities) floor is satisfied; M4 (every capability has >=1 realizing module) is satisfied. **The exact module shape is a Bucket 2 decision**: the user picks whether to ship 4 modules (collapsing INTAKE into MATTER), 5 modules (the listed set without KNOWLEDGE), or 6 modules (full set). **This decision is the gating one for the whole audit.**

### Pass 3, Neighbor discovery

Edges discovered by union of `handoffs.source_domain_id=25 OR handoffs.target_domain_id=25` plus DMDO cross-references (legacy rollup):

| Neighbor | Outbound | Inbound | DMDO cross-refs | Edge weight | Pairwise deep dive? |
|---|---|---|---|---|---|
| ECM | 5 | 1 | `legal_contracts` (consumer on LSD; CLM masters) | 7 | yes (weight >=3) |
| AUDIT | 3 | 0 | 0 | 3 | yes |
| HCM | 2 | 0 | implicit (employees as custodian on legal_holds) | 3 | yes |
| GRC | 1 | 0 | `compliance_obligations` cross-rel target; `regulatory_inquiries` adjacency | 3 | yes |
| CLM | 0 | 0 | `legal_contracts` (consumer); `outside_counsel_engagements` adjacency | 2 | summary |
| RE-PROP-MGMT | 0 | 1 | 0 | 1 | summary |
| HCMS | 0 | 1 | 0 | 1 | summary (suspicious; see Bucket 2) |

### Pass 4, Pairwise reconciliation per neighbor (edge weight >=3)

Because LSD has zero `domain_modules`, every pairwise diff is partially blocked: every `target_domain_module_id` (when LSD is target) and every `source_domain_module_id` (when LSD is source) is NULL, by construction. The four pairwise sections below report what the boundary should look like once M1 is cured; the actual per-row fixes are folded into the B10b backfill that runs after the module set is loaded.

**LSD vs. ECM (edge weight 7).**

| Section | Finding |
|---|---|
| Existing handoffs fully wired | 0 (all 6 have NULL module FKs on the LSD side). |
| Existing handoffs with NULL module FK | All 6 (handoffs 911, 912, 915, 1028, 1031 outbound; 824 inbound). Cure after M1 lands: LSD-MATTER-MGMT becomes the source for `in_house_legal_matter.*` events; LSD-LEGAL-HOLD becomes the source for `legal_hold.issued` / `ediscovery_request.created` / `legal_advice_record.issued` events; LSD-MATTER-MGMT becomes the inbound target for `legal_hold.placed`. |
| Missing handoffs the catalog implies should exist | Possible: `legal_advice_record.issued` to ECM (already present, 1031); `legal_case_docket.updated` to ECM if dockets are filed in ECM. Surface as Bucket 3 since vendor evidence is light. |
| Boundary integrity gaps (B5 routing) | None: `content_documents` is canonically mastered by ECM and consumed properly. |
| Cross-domain `data_object_relationships` mirror check | Mirrors present (rows 381 freezes, 382 collects_from, 383 provisions, 384/584 files_to / is_filed_in). |

**LSD vs. AUDIT (edge weight 3).**

| Section | Finding |
|---|---|
| Existing handoffs fully wired | 0 (NULL source modules). |
| Existing handoffs with NULL module FK | 3 (914 `regulatory_inquiry.received`, 916 `legal_hold.released`, 1029 `in_house_legal_matter.closed`). Cure after M1: 914 source = LSD-REGULATORY-RESPONSE; 916 source = LSD-LEGAL-HOLD; 1029 source = LSD-MATTER-MGMT. |
| Missing handoffs the catalog implies should exist | `ediscovery_request.produced` to AUDIT (evidence package) is implied by the cross-rel `legal_holds evidences audit_engagements`. **B9 candidate.** Bucket 3. |
| Boundary integrity gaps | None. |
| Cross-domain `data_object_relationships` mirror | Mirrors present (376 triggers, 377 evidences, 378 shares_outcome_with). |

**LSD vs. HCM (edge weight 3).**

| Section | Finding |
|---|---|
| Existing handoffs fully wired | 0 (NULL source modules). |
| Existing handoffs with NULL module FK | 2 (913 `legal_hold.issued`, 1032 `legal_advice_record.employee_related`). Cure: 913 source = LSD-LEGAL-HOLD; 1032 source = LSD-MATTER-MGMT. Target-side LSD module FKs are NULL on the HCM side because the receiving HCM module isn't yet attributed; that's HCM's B10b. |
| Missing handoffs the catalog implies should exist | None obvious; `legal_advice_record.employee_related` covers the employee-touching advice path. |
| Boundary integrity gaps | None: `employees` is platform-builtin-adjacent (mastered by HCM); LSD's cross-rels to `employees` (379 identifies_custodians_from, 380 references) are valid. |
| Cross-domain `data_object_relationships` mirror | Mirrors present. |

**LSD vs. GRC (edge weight 3).**

| Section | Finding |
|---|---|
| Existing handoffs fully wired | 0 (NULL source modules). |
| Existing handoffs with NULL module FK | 1 (1030 `in_house_legal_matter.regulatory_disclosure_required`). Cure: 1030 source = LSD-MATTER-MGMT. |
| Missing handoffs the catalog implies should exist | Bidirectional flow likely: GRC's `compliance_obligation.opened` should fan-in to LSD-MATTER-MGMT as a matter trigger (`matter.opened_from_obligation`). **Bucket 3, B9 candidate on GRC side, B10 owed to LSD.** |
| Boundary integrity gaps | None. |
| Cross-domain `data_object_relationships` mirror | Row 375 (`in_house_legal_matters triggers compliance_obligations`) covers the LSD-to-GRC direction. GRC-to-LSD mirror would need a new edge. |

**Lighter-neighbor summaries.**

- **LSD vs. CLM (weight 2).** `legal_contracts` consumed on LSD; no handoffs in either direction today, which is acceptable because CLM-AUTHORING / CLM-NEGOTIATION fire to other consumers (CRM, S2P, SMP, CSM) and the LSD reference is read-only via the consumer DMDO. Once LSD-MATTER-MGMT is modularized, a CLM-to-LSD outbound on `contract.executed` is plausible for the matter-doc workspace. Bucket 3.
- **LSD vs. RE-PROP-MGMT (weight 1).** Inbound handoff 300 `property_tenant.evicted` to LSD on `property_tenants`. **Suspicious.** Bucket 2 review: real-estate property tenant evictions land on legal intake in some jurisdictions but the payload (`property_tenants`) is a poor fit for LSD's masters; an intake-creation handoff payload should usually be `legal_intake_requests`, not the source-domain master. Likely a misrouted handoff or one that needs a re-route to LSD-INTAKE-PORTAL once it exists.
- **LSD vs. HCMS (weight 1).** Inbound handoff 807 `editorial_workflow.review_required` to LSD on `editorial_workflows`. **Suspicious.** HCMS editorial workflows belong to web/content review; routing to LSD makes sense only when the content needs legal sign-off (privacy disclosures, regulated content). Same shape problem as RE-PROP-MGMT: the payload is the source master, not a legal intake. Bucket 2.

### Bucket 1, In-scope confirmed gaps

#### MISSING (structural / modularization)

| ID | Item | Proposed action |
|---|---|---|
| B1-M1 | Zero `domain_modules` rows for LSD | Author the LSD module set (recommended: 4-6 modules; default proposal is 5: LSD-INTAKE-PORTAL, LSD-MATTER-MGMT, LSD-LEGAL-HOLD, LSD-OUTSIDE-COUNSEL, LSD-REGULATORY-RESPONSE). Final shape depends on Bucket 2 #1. |
| B1-M2 | Capability under-count (only 2 cross-cutting capabilities linked) | Author legal-specific capabilities (proposed: `LEGAL-INTAKE-TRIAGE`, `LEGAL-MATTER-MGMT`, `LEGAL-HOLD-MGMT`, `LEGAL-EDISCOVERY`, `OUTSIDE-COUNSEL-MGMT`, `REGULATORY-RESPONSE`) plus keep the existing two. Final list depends on Bucket 2 #1 module shape. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | B12 | Zero `data_object_lifecycle_states` rows on any of the 8 masters. | Author state machines per master (matters: submitted -> triaged -> opened -> active -> on_hold -> closed; intake: submitted -> triaged -> approved/rejected/routed; holds: drafted -> issued -> acknowledged -> released; ediscovery: created -> collecting -> processing -> reviewing -> produced -> closed; engagements: proposed -> active -> completed; advice: drafted -> issued; inquiries: received -> acknowledged -> responding -> responded -> closed; dockets: open -> updated -> closed). Anchor `domain_module_id` per Rule #14's module-permission derivation once B1-M1 lands. |
| B1-S2 | B9 / enum | All 12 LSD trigger_events have `event_category=''`. | PATCH each to `lifecycle` (state-transition events) or `state_change` per the catalog enum. |
| B1-S3 | A4 | `domains.catalog_tagline` and `catalog_description` are empty. | Author both per Rule #20 (buyer-shaped, workflow + value voice). Surface drafts to user before write. |
| B1-S4 | B4 | Pattern flags on all 8 masters are default-false without positive consideration. | Per-master review: propose `legal_advice_records.has_personal_content=true` (privilege); `legal_holds.has_submit_lock=true` (immutable once issued, with explicit release event); `outside_counsel_engagements.has_single_approver=true` (GC sign-off on engagement letter). Surface to user (Bucket 2 #4) before patching. |
| B1-S5 | F1 / naming | Legacy domain-level `lsd-system` skill (id 82) uses kebab + system suffix. Must be retired after per-module system skills land. | After B1-M1: author one `<module_code_lower>_agent` skill per LSD module (5 expected); migrate 10 skill_tools to the appropriate per-module skills; DELETE skill 82. |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | All 14 cross-domain handoffs touching LSD carry NULL `source_domain_module_id` (when LSD is source: 11 rows) or NULL `target_domain_module_id` (when LSD is target: 3 rows). | Cascades from B1-M1. After modules exist, run the deterministic backfill: source-side picks the LSD module that masters the trigger_event's `data_object_id`; target-side picks the LSD module that consumes / masters the handoff's payload. Reference: [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). |
| B1-B2 | Handoff 1045 `outside_counsel.engaged` (trigger_event) has zero subscribers. | Likely real B9 gap. Candidate subscribers: SPEND-MGMT (accrual / engagement-letter spend tracking), CLM (engagement letter as a contract), GRC (conflict check obligations). Surface as multi-target fan-out; user picks targets. |

#### APQC TAGGING (H1)

Per-handoff `handoff_processes` proposals from LSD's 14 cross-domain handoffs. Confident L3 matches and one L2; deferred entries listed at the bottom.

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | external_id | confidence |
|---|---|---|---|---|---|---|---|
| 911 | LSD -> ECM | legal_hold.issued | legal_holds | Investigate legal aspects | 373 | 11204 | confident L3 |
| 912 | LSD -> ECM | ediscovery_request.created | ediscovery_requests | Resolve disputes and litigations | 396 | 11050 | confident L3 |
| 913 | LSD -> HCM | legal_hold.issued | legal_holds | Investigate legal aspects | 373 | 11204 | confident L3 |
| 914 | LSD -> AUDIT | regulatory_inquiry.received | regulatory_inquiries | Manage regulatory compliance | 369 | 16463 | confident L3 |
| 915 | LSD -> ECM | legal_matter.opened | in_house_legal_matters | Investigate legal aspects | 373 | 11204 | confident L3 |
| 916 | LSD -> AUDIT | legal_hold.released | legal_holds | Investigate legal aspects | 373 | 11204 | confident L3 |
| 1028 | LSD -> ECM | in_house_legal_matter.opened | in_house_legal_matters | Investigate legal aspects | 373 | 11204 | confident L3 |
| 1029 | LSD -> AUDIT | in_house_legal_matter.closed | in_house_legal_matters | Investigate legal aspects | 373 | 11204 | confident L3 |
| 1030 | LSD -> GRC | in_house_legal_matter.regulatory_disclosure_required | in_house_legal_matters | Manage regulatory compliance | 369 | 16463 | confident L3 |
| 1031 | LSD -> ECM | legal_advice_record.issued | legal_advice_records | Provide legal advice/counseling | 397 | 11051 | confident L3 |
| 1032 | LSD -> HCM | legal_advice_record.employee_related | legal_advice_records | Provide legal advice/counseling | 397 | 11051 | confident L3 |

Deferred-to-Discover Pass 3 (no clean PCF L2/L3 cross-industry match):

| handoff_id | source -> target | trigger_event | payload | Defer reason |
|---|---|---|---|---|
| 300 | RE-PROP-MGMT -> LSD | property_tenant.evicted | property_tenants | Suspicious inbound (Bucket 2 #5). Tag depends on whether RE-PROP-MGMT or LSD owns the resulting workflow; defer until routing is decided. |
| 807 | HCMS -> LSD | editorial_workflow.review_required | editorial_workflows | Suspicious inbound (Bucket 2 #5). Same shape issue as 300; defer until routing is decided. |
| 824 | ECM -> LSD | legal_hold.placed | content_documents | This is the consumer-side of ECM applying the hold; the cross-industry PCF treats this as substrate-level retention, not a distinct legal-process step. Defer to custom-process authoring. |

Counts: **11 agent_curated `handoff_processes` proposals + 3 deferred = 14 total H1 entries** (1 Bucket-1 finding type with sub-tables per the prompt's count convention; this is **B1-H1** in the open-question count, even though the sub-tables propose 11 rows). Volume against the 0.5N to 0.8N target: N=14 cross-domain handoffs; 11 proposals = 0.79N. On target.

### Bucket 2, Surface-for-user (judgment calls)

1. **LSD module shape.** The single most important decision in this audit. Options:
   - **(a) 5 modules** (recommended default): LSD-INTAKE-PORTAL, LSD-MATTER-MGMT, LSD-LEGAL-HOLD, LSD-OUTSIDE-COUNSEL, LSD-REGULATORY-RESPONSE. Cleanest mapping to flagship vendor surfaces; supports clean role bundles (intake coordinator / counsel / litigation paralegal / GC).
   - **(b) 4 modules**: collapse LSD-INTAKE-PORTAL into LSD-MATTER-MGMT (intake is a state on matter). Tighter scope; risks losing the portal-as-distinct-deploy story that ServiceNow / LawVu both lean on.
   - **(c) 6 modules**: add LSD-KNOWLEDGE as a distinct module realizing KNOWLEDGE-MGMT for legal-scoped articles. Closest to ServiceNow LSD's own taxonomy.
   - **(d) Defer modularization and ship LSD as a single LSD-FULL module** (capability count < 3 path). Only viable if Bucket 2 question 1 also drops legal-specific capabilities below 3.
2. **`legal_contracts` necessity demotion.** Currently `consumer + required` from CLM. Per Rule #16 (infrastructure masters are `optional` on non-master rows), should this drop to `optional`? Reading Rule #16 strictly: contracts are not infrastructure (they carry workflow), so the `required` necessity may be correct because a matter genuinely cannot reference a contract without the CLM master being deployed. Confirm or demote.
3. **Knowledge-management surface for legal.** The KNOWLEDGE-MGMT capability is linked to LSD. Options: (a) author a legal-specific `legal_knowledge_articles` master in a new LSD-KNOWLEDGE module; (b) consume the cross-cutting `knowledge_articles` master (already in ITSM-KNOWLEDGE) as a `consumer` row; (c) drop the capability link as not load-bearing for LSD. Vendor evidence: LawVu carries a "Knowledge" object distinctly; ServiceNow LSD reuses Now Knowledge with legal-scoped article types. (a) and (b) both have vendor backing; (c) is the "scope creep" exit.
4. **Pattern flags review on 8 masters.** Per B1-S4: the proposed flag patches are `legal_advice_records.has_personal_content=true`, `legal_holds.has_submit_lock=true`, `outside_counsel_engagements.has_single_approver=true`. Confirm per row.
5. **Suspicious inbound handoffs** (300 RE-PROP-MGMT -> LSD, 807 HCMS -> LSD). Both carry a source-mastered payload (`property_tenants`, `editorial_workflows`) into LSD, which is the wrong payload shape for an intake-creation handoff. Options per row: (i) reroute the target to RE-PROP-MGMT or HCMS internal-legal modules if those will be authored; (ii) repaint the payload as `legal_intake_requests` (the LSD master that gets created); (iii) delete as misrouted. Likely (ii) once LSD-INTAKE-PORTAL exists.
6. **Pairwise reconciliation depth.** Pass 4 above ran four neighbors at weight >=3 (ECM, AUDIT, HCM, GRC) with abbreviated diffs because every LSD-side module FK is NULL. Decide: rerun pairwise after B1-M1 lands (recommended, every row gets concrete fix targets then), or accept the abbreviated form now and skip the rerun.

### Bucket 3, Phase 0 pending (speculative)

| ID | Candidate | Vendor evidence | Notes |
|---|---|---|---|
| B3-1 | `matter_assignments` (LSD-MATTER-MGMT) | LawVu (Assignments), Onit (Matter Team), Litera (Matter Members) | Typed assignment row separating the matter's owner from collaborators. |
| B3-2 | `engagement_letters` (LSD-OUTSIDE-COUNSEL) | Litera (Engagement Letter automation), Onit (Engagement Template Library), LawVu (Engagement Workflows) | Distinct from outside_counsel_engagements (the relationship) and legal_contracts (the executed contract). |
| B3-3 | `regulatory_inquiry_responses` (LSD-REGULATORY-RESPONSE) | LawVu (Inquiry Responses), Onit (Regulator Response Packages) | Typed response packages per inquiry. |
| B3-4 | B9 fan-out for trigger_event 1045 `outside_counsel.engaged` | absent today | Likely fan-out to SPEND-MGMT, CLM, GRC. |
| B3-5 | B9 candidate `ediscovery_request.produced` to AUDIT | mirror of cross-rel 377 (`legal_holds evidences audit_engagements`) | Evidence package handoff. |
| B3-6 | GRC to LSD inbound on `compliance_obligation.opened` | mirror direction of existing LSD to GRC | Matter-creation trigger from regulatory obligation. |

### Cross-bucket dependencies

- **Bucket 1 is gated by Bucket 2 #1.** Every Bucket 1 STRUCTURAL fix (B1-S1 lifecycle states, B1-B1 module attribution, B1-S5 skill migration) depends on the chosen module shape. The user must resolve Bucket 2 #1 BEFORE the agent applies B1-M1 / B1-M2 / B1-S1 / B1-B1 / B1-S5. APQC tagging (B1-H1) and event-category PATCHes (B1-S2) are independent and can ship first.
- **Bucket 2 #3 (knowledge surface)** is informed by Bucket 2 #1 (it changes whether LSD-KNOWLEDGE is a 6th module).
- **Bucket 2 #5 (suspicious inbounds)** is informed by Bucket 2 #1: rerouting depends on whether LSD-INTAKE-PORTAL exists.
- **Bucket 3 #1, #2, #3** are entity-level candidates whose module hosts depend on Bucket 2 #1.
- **Bucket 3 #4, #5, #6** are handoff candidates independent of Bucket 2 #1; the source/target side modules constrain wiring once LSD modules land, but the existence of the handoff is independent.

### Per-bucket prompts

- **Bucket 1:** "Approve the 10 in-scope fixes once Bucket 2 #1 resolves the module shape. Reply 'all', 'just <ids>', or 'skip', and confirm the module shape. The 3 fixes that don't depend on module shape (B1-H1 APQC tags, B1-S2 event_category patches, B1-S3 catalog UX drafts after surface) can ship first if you want a quick win."
- **Bucket 2:** "Per item: (1) which module shape (a/b/c/d)? (2) demote `legal_contracts` necessity to optional or keep required? (3) which knowledge-management approach (a/b/c)? (4) approve the 3 pattern-flag patches as proposed, edit, or decline? (5) per row 300 + 807: reroute, repaint payload, or delete? (6) rerun pairwise after B1-M1, or accept abbreviated now?"
- **Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which of B3-1 through B3-6 to treat as confirmed and queue for the next fix load."

### Report-only follow-ups (owed by other domains)

- **HCM B10b**: handoffs 913 (`legal_hold.issued` to HCM) and 1032 (`legal_advice_record.employee_related` to HCM) carry NULL `target_domain_module_id`. HCM's B10b owes the patch once HCM identifies which module receives custodian-notification and which receives employee-advice-pointer (likely HCM-LIFECYCLE-WORKFLOWS or HCM-CORE-EMPLOYEE for the former; HRSD-EMPLOYEE-CASE for the latter if HRSD owns it).
- **ECM B10b**: handoffs 911, 912, 915, 1028, 1031 (outbound LSD to ECM) and 824 (inbound ECM to LSD) carry NULL `target_domain_module_id` (the ECM side). ECM's B10b owes the patch.
- **AUDIT B10b**: handoffs 914, 916, 1029 (outbound LSD to AUDIT) carry NULL `target_domain_module_id`. AUDIT's B10b owes the patch.
- **GRC B10b**: handoff 1030 (outbound LSD to GRC) carries NULL `target_domain_module_id`. GRC's B10b owes the patch.
- **GRC B9 candidate**: `compliance_obligation.opened` to LSD-MATTER-MGMT (per cross-rel 375 + Pass 4 LSD vs. GRC). Surfaces when GRC is next validated.
- **RE-PROP-MGMT**: handoff 300 ownership review (suspicious inbound to LSD). The decision on whether the handoff is real or misrouted is partly RE-PROP-MGMT's call.
- **HCMS**: handoff 807 ownership review (suspicious inbound to LSD). Same shape question as RE-PROP-MGMT.
- **LEGAL-PRACT-MGMT scope boundary**: the 5 existing legal roles (LEGAL-COUNSEL, LEGAL-ATTORNEY, LEGAL-PARALEGAL, LEGAL-CONFLICTS-PARTNER, LEGAL-OFFICE-MGR) are all bound to LEGAL-PRACT-MGMT / CLM modules. Whether any of them also bundle LSD modules (once LSD modules exist) is a LEGAL-PRACT-MGMT-side decision. Specifically: an in-house Legal Counsel role might legitimately span both LEGAL-PRACT-MGMT (if also doing outside-firm practice tasks) and LSD, but the default reading is that the 5 LEGAL-PRACT-MGMT roles stay outside-firm-shaped, and LSD will need its own in-house persona set.

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass applying truly-technical B1 items from the 2026-05-30 audit. Judgment-bearing items deferred per the brief.

Loader: [.tmp_deploy/fix_lsd_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_lsd_b1_technical_2026_05_31.ts).
Tenant confirmed: `ma@adenin.com` (domain_map id 1001) via `getCurrentUser`.

### Fixes applied

| ID | Type | Action | Result |
|---|---|---|---|
| B1-S2 | PATCH `trigger_events.event_category` enum backfill | 12 LSD trigger_events classified per audit rubric (lifecycle for master-lifecycle transitions: `.submitted`, `.opened`, `.closed`, `.released`, `.issued`, `.created`, `.engaged`, `.received`; state_change for qualifier transitions: `legal_case_docket.updated`, `in_house_legal_matter.regulatory_disclosure_required`, `legal_advice_record.employee_related`). Cross-checked against catalog precedent (`case.created`, `asset.retired`, `demand_intake.submitted`, `legal_contract.signed` all `lifecycle`; `access_policy.updated` `state_change`). | 12 patched, 0 already correct. Final shape: 9 `lifecycle` + 3 `state_change`. |
| B1-H1 | INSERT 11 `handoff_processes` rows pre-specified by audit Bucket-1 table | All 4 referenced PCF rows verified live before insert (process_id 369 / 11.2.2 Manage regulatory compliance; 373 / 11.3.4 Investigate legal aspects; 396 / 12.4.7 Resolve disputes and litigations; 397 / 12.4.8 Provide legal advice/counseling; all `apqc_pcf_cross_industry` L3). 11 handoffs (911, 912, 913, 914, 915, 916, 1028, 1029, 1030, 1031, 1032) confirmed extant with `source_domain_id=25`. `proposal_source='agent_curated'`, `record_status='new'` (default, Rule #1), `role='implements'` (default), `notes=''` (default, Rule #15). | 11 inserted, 0 pre-existing duplicates. H1 catalog quality now 11 of 14 cross-domain handoffs carry an `agent_curated` proposal (78.6% against the 50–80% target). |

### Deferred (with reason)

| ID | Reason |
|---|---|
| B1-M1 | New `domain_modules` rows: requires Bucket 2 #1 module-shape decision (4 / 5 / 6 modules); explicit "user picks" gate. |
| B1-M2 | New capability shape: gated on Bucket 2 #1 module shape (which dictates capability set). |
| B1-S1 (B12) | Lifecycle states for 8 masters: requires `domain_module_id` per state per Rule #14 once M1 lands; gated on B1-M1. |
| B1-S3 (A4) | `domains.catalog_tagline` and `catalog_description` authoring: blocked by Rule #20 (drafts surface to user before write). |
| B1-S4 (B4) | Pattern-flag flips on 3 masters (`legal_advice_records.has_personal_content`, `legal_holds.has_submit_lock`, `outside_counsel_engagements.has_single_approver`): explicit "surface to user" in Bucket 2 #4. |
| B1-S5 (F1) | Legacy `lsd-system` skill retirement and per-module skill authoring: gated on B1-M1. |
| B1-B1 (B10b) | Handoff `source_domain_module_id` / `target_domain_module_id` backfill on 14 cross-domain handoffs: cascades from B1-M1 (no LSD modules to point at yet). |
| B1-B2 | `outside_counsel.engaged` fan-out: audit calls for user to pick targets (SPEND-MGMT / CLM / GRC). |
| H1-deferred (handoffs 300, 807, 824) | 3 inbound handoffs (RE-PROP-MGMT, HCMS, ECM): the audit explicitly defers these to Discover Pass 3 / routing-decision in Bucket 2 #5; not in technical scope. |

### Verification queries (re-run to confirm)

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/trigger_events?data_object_id=in.(633,634,635,636,637,638,639,640)&select=id,event_name,event_category&event_category=eq.&order=id.asc"}'
# expect: [] (no LSD trigger_events with empty category)

semantius call crud postgrestRequest '{"method":"GET","path":"/handoff_processes?handoff_id=in.(911,912,913,914,915,916,1028,1029,1030,1031,1032)&select=handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc"}'
# expect: 11 rows, all proposal_source=agent_curated, record_status=new
```

### UI links

- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/handoff_processes

### What still blocks the audit close

Bucket 2 #1 (module shape) remains the single gating decision: every remaining Bucket-1 STRUCTURAL fix (lifecycle states, handoff module FK backfill, skill migration) is cascaded from it. The two technical wins above are the only B1 work that could ship without that decision.

## 2026-05-31, Audit

### Summary

- Current footprint: **8 master data_objects + 1 consumer rollup** (`legal_contracts`), **0 `domain_modules` rows** (primary host = 0; cross-cutting host junctions = 0), 2 capabilities (KNOWLEDGE-MGMT, SELF-SERVICE-PORTAL), 5 solutions (all `coverage_level=primary`), 2 regulations (eIDAS, EU Whistleblower), 2 business_function_domains rows (Legal owner + IT Operations contributor), 12 trigger_events on LSD masters (9 lifecycle + 3 state_change, all populated post-continuation), 11 outbound + 3 inbound cross-domain handoffs (14 total), 0 intra-domain handoffs, 16 aliases on 8 masters, **0 lifecycle states across every master**, **13 of 14 handoff_processes rows** (92.9% coverage; only handoff 807 HCMS untagged), 0 LSD-anchored roles, 0 LSD-anchored role_modules, 1 legacy domain-level `system` skill (`lsd-system` id 82) with 10 skill_tools.
- Vendor-surface basis (flagship vendors enumerated): **ServiceNow Legal Service Delivery**, **LawVu**, **Onit Enterprise Legal Management**, **Litera**, **iManage Cloud**. Unchanged from 2026-05-30 audit; ServiceNow LSD + LawVu anchor intake-portal motion, Onit anchors matter-spend leg, Litera + iManage anchor document leg.
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

**Headline structural verdict (unchanged from 2026-05-30 + 2026-05-31 continuation).** LSD remains in pre-modular shape: zero `domain_modules` rows for `domain_id=25` and zero cross-cutting host junctions. That single fact cascades into M1 / M2 / M4 / M6 fails (M2 vacuously passes only because capability count is 2), B10b 100%-null on every LSD-side handoff, B12 fully blocked (0 lifecycle states), F1 + F2 fail (legacy `lsd-system` skill present, zero module-level system skills), E1 vacuously passes only because the 2-module floor blocks roles. **The 2026-05-31 continuation cured B1-S2 (event_category) and most of B1-H1 (APQC tagging); B1-M1 remains the gating decision.**

**Catalog quality (H-band headline):** 0 of 14 cross-domain handoffs carry an `approved` `handoff_processes` tag (0%). **Process health (side-bar):** 13 of 14 (92.9%) carry an `agent_curated` proposal at `record_status='new'`. Only handoff 807 (HCMS to LSD on `editorial_workflows`) lacks a tag. This is well above the 50-80% volume target; H1 process-wise is effectively cured (single remaining handoff is deferred-pending per Bucket 2 #5 routing decision).

### Vendor surface basis

Same as 2026-05-30 audit. In-house legal service delivery as the buyer-shaped market: legal department as internal service provider, intake from business units, matter triage, work routing, legal-hold + ediscovery orchestration, regulatory-inquiry response, outside-counsel engagement, in-house knowledge surface. Pure-play specialists preferred. Regulated leg anchored by eIDAS (qualified electronic signatures) and EU Whistleblower (intake routing). FCRA, HIPAA, GDPR adjacent only.

### Pass 1, Structural (per-domain completeness checklist) findings

**S-band sweep (coverage).**

| Band | Pass / fail | Note |
|---|---|---|
| S1 (`domains` direct FK coverage) | partial | `domain_modules`, `domain_module_data_objects`, `domain_module_host_domains` = 0; `domain_data_objects` populated but legacy-only; `solution_domains`, `capability_domains`, `domain_regulations`, `business_function_domains`, `handoffs.source_domain_id`, `handoffs.target_domain_id`, `skills` non-zero. **Zero-row anomaly on `domain_modules` routes to M1.** |
| S2 (per-module indirect-table coverage) | n/a (no modules to count) | Routes to M1. |
| S3 (per-master indirect-table coverage) | partial | All 8 masters: 0 lifecycle states. Trigger events: every master has at least 1 (matters 3, legal_advice_records 2, legal_holds 2, intake 1, ediscovery 1, outside_counsel 1, regulatory_inquiries 1, dockets 1). Aliases 16 rows. **Zero-state on every master routes to B12.** |

**A-band (Phase A).**

| ID | Result | Detail |
|---|---|---|
| A1 (domains metadata) | pass | `crud_percentage=95`, `min_org_size='30 m <2500'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=1200`, `market_size_source_year=2025`. `business_logic=''` acceptable because `crud_percentage >= 95`. |
| A2 (capabilities) | partial | 2 capability_domains rows (KNOWLEDGE-MGMT, SELF-SERVICE-PORTAL), below the typical 5-8 floor. Both cross-cutting; neither has a realizing LSD module (gated on M1). Under-counted because legal-specific capability set was not authored at load time. |
| A3 (solutions) | pass | 5 solutions all `primary`: ServiceNow LSD, LawVu, iManage, Litera, Onit. |
| A4 (catalog UX) | fail | `catalog_tagline=''`, `catalog_description=''`. Unchanged. |

**M-band (Phase M).** **All blocking fails. Modularization remains the structural gate.**

| ID | Result | Detail |
|---|---|---|
| M1 (>=1 `domain_modules` row) | fail | Zero `domain_modules` rows on `domain_id=25`; zero cross-cutting hosts via `domain_module_host_domains`. Gated on Bucket 2 #1. |
| M2 (>=2 modules when capabilities >=3) | vacuous pass (cap_count=2) | Once A2 is cured, M2 will need >=2 modules. |
| M4 (every capability has >=1 realizing module) | fail | KNOWLEDGE-MGMT and SELF-SERVICE-PORTAL have realizing modules in ITSM / HRSD / CSM, but none on LSD. |
| M5 (workflow-gate states have `domain_module_id`) | vacuous pass | No lifecycle states exist. |
| M6 (every module realizes >=1 capability) | vacuous pass | No modules exist. |
| M7 (single-master integrity) | pass | 8 masters; each has exactly one `domain_data_objects.role='master'` row; zero rows in `domain_module_data_objects` for these 8 masters (consistent with M1 zero state). |
| M8 (per-module catalog UX) | n/a | No modules to check. |

**B-band (Phase B).**

| ID | Result | Detail |
|---|---|---|
| B1 (>=1 master) | pass | 8 masters confirmed. |
| B2 (singular_label + plural_label) | pass | All 8 masters have both labels populated. |
| B3 (naming arbitration) | pass | All 8 masters use prefixed form; zero canonical-bare-word claims. |
| B4 (pattern flags considered) | partial | **Update from 2026-05-30:** `legal_holds.has_submit_lock=true` is now set (cured between the two audits). `legal_advice_records.has_personal_content` and `outside_counsel_engagements.has_single_approver` still default-false; B1-S4 remains for those two. |
| B5 (embedded_master integrity) | pass | No `embedded_master` rows on LSD's side. `legal_contracts` consumer points at canonical CLM-REPOSITORY master, valid. |
| B6 (intra-domain relationships) | pass | 9 verbed edges between LSD masters (rows 358-366). |
| B7 (users edges) | pass | 8 user edges authored (rows 367-374), all reverse direction (users -> masters). |
| B8 (outbound cross-domain relationships) | pass | 11 cross-domain edges present (rows 375-384, 584): matters trigger compliance_obligations (GRC); regulatory_inquiries trigger audit_engagements (AUDIT); legal_holds evidences / matters shares_outcome_with audit_engagements; legal_holds identifies_custodians_from / legal_advice_records references employees (HCM); legal_holds freezes / ediscovery_requests collects_from / legal_advice_records files_to + is_filed_in content_documents (ECM); matters provisions document_folders (ECM). |
| B9 (outbound trigger_events + handoffs) | partial | 12 trigger_events on LSD masters; 11 outbound handoffs. `legal_intake.submitted` (1041) has zero outbound (correct, internal). `outside_counsel.engaged` (1045) has zero subscribers (likely real B9 gap to S2P / CLM / SPEND-MGMT). `legal_case_docket.updated` (1047) has zero subscribers (potential leaf). **All 12 event_category now populated correctly (9 lifecycle + 3 state_change) - B1-S2 cured by 2026-05-31 continuation.** |
| B9b (intra-domain cross-module handoffs) | n/a | Skipped: no modules to derive pairs from. Will become applicable once M1 cures. |
| B10 (inbound handoffs, REPORT ONLY) | partial | 3 inbound: 300 RE-PROP-MGMT (`property_tenant.evicted`), 807 HCMS (`editorial_workflow.review_required`), 824 ECM (`content_document.legal_hold_applied`). All three observation-only; 300 + 807 suspicious shape (Bucket 2 #5). |
| B10b (per-module attribution on handoffs) | fail | **All 14 cross-domain handoffs touching LSD have `source_domain_module_id=NULL` AND `target_domain_module_id=NULL`** on the LSD side. Cascades from M1. |
| B11 (aliases) | pass | 16 alias rows across all 8 masters. |
| B12 (lifecycle states + pattern flags) | fail | **Zero `data_object_lifecycle_states` rows for any of the 8 LSD masters.** Workflow-bearing masters (matters, intake, holds, ediscovery, engagements, advice, inquiries, dockets) all carry observable transitions; none are config-shape exempt. |

**C-band.**

| ID | Result | Detail |
|---|---|---|
| C1 (>=1 owner business_function_domains) | pass | Legal as `owner`, IT Operations as `contributor`. |
| C2 (capability function overrides) | n/a | Both LSD capabilities are cross-cutting; overrides depend on which LSD module hosts them once M1 cures. |

**D-band.**

| ID | Result | Detail |
|---|---|---|
| D1 (UI spot-check) | deferred | LSD module page would render empty; spot-check after M1 fix. |

**E-band.**

| ID | Result | Detail |
|---|---|---|
| E1 (role coverage) | vacuous pass (0 modules) | Zero LSD-anchored roles (queries on `LSD`, `LEGAL-OPS`, `LEGAL-INTAKE` patterns returned []). |
| E2 (2-module floor on role_modules) | n/a | No LSD-anchored roles. |
| E3 (`interaction_level` set) | n/a | No LSD-anchored role_modules. |
| E4 (non-empty role_permissions bundle) | n/a | No LSD-anchored roles. |
| E5 (Path A / Path B agreement) | n/a | No LSD-anchored roles. |

**F-band.**

| ID | Result | Detail |
|---|---|---|
| F1 (no legacy domain-level system skills once module-level exist) | partial | Skill row 82 `lsd-system` (`skill_type='system'`, `domain_id=25`, `domain_module_id=null`) is the legacy domain-level skill. Only LSD system skill because no module-level skills can exist before M1. Retire after M1 cures and per-module skills land. |
| F2 (exactly one `system` skill per `domain_modules` row) | fail | Zero `domain_modules` rows; zero module-anchored system skills. |
| F3 (each system skill has >=1 `skill_tools`) | partial pass for legacy | Legacy skill 82 has 10 `skill_tools` rows (8 query tools, 1 send_email, 1 sign_document). |
| F4 (`operation_kind` vs. `data_object_id` invariant) | pass | 8 `query_*` tools each carry valid `data_object_id`; `send_email` and `sign_document` are `side_effect` with `data_object_id=null`. |
| F5 (Semantius score computable) | pass for legacy skill | Strict: 9 of 10 tools at `platform` (`sign_document` external) = 90%. Operational: 90%. Per-module score re-derived after M1. |

**H-band (Phase H, APQC coverage).**

| ID | Result | Detail |
|---|---|---|
| H1 (every cross-domain handoff has a tag or deferred entry) | **near-cured** | **13 of 14 cross-domain handoffs carry an `agent_curated` `handoff_processes` row at `record_status='new'`** (process-health: 92.9%). 2026-05-31 continuation loaded 11 new tags (handoffs 911-916, 1028-1032); handoffs 300 + 824 each gained a tag in the interim (handoff 300 -> PCF 11059 L4 "Receive work product..."; handoff 824 -> PCF 21683 L3 "Control delivered content"). **Only handoff 807 (HCMS to LSD, `editorial_workflow.review_required`) remains untagged**, gated on Bucket 2 #5 routing decision. **Catalog quality (approved count): 0/14 = 0% (no reviewer sign-off yet).** |

### Pass 2, Market audit (semantic) findings

Unchanged from 2026-05-30 audit. MISSING candidates: `matter_assignments`, `legal_intake_triage_decisions`, `engagement_letters`, `legal_spend_invoices` (ELM-scoped), `legal_matter_budgets` (ELM-scoped), `regulatory_inquiry_responses`, `legal_knowledge_articles`. WRONG-OWNERSHIP: none. SCOPE-CREEP: `legal_contracts` necessity demotion question stands.

### Pass 3, Neighbor discovery

Unchanged neighbor weights: ECM (7), AUDIT (3), HCM (3), GRC (3), CLM (2), RE-PROP-MGMT (1), HCMS (1).

### Pass 4, Pairwise reconciliation per neighbor (edge weight >=3)

All four pairwise diffs remain partially blocked by NULL LSD-side module FKs. Concrete fix targets land once M1 cures. Pairwise sections from 2026-05-30 audit still apply verbatim.

### Bucket 1, In-scope confirmed gaps

#### MISSING (structural / modularization)

| ID | Item | Proposed action |
|---|---|---|
| B1-M1 | Zero `domain_modules` rows for LSD | Author the LSD module set (recommended default: 5 modules: LSD-INTAKE-PORTAL, LSD-MATTER-MGMT, LSD-LEGAL-HOLD, LSD-OUTSIDE-COUNSEL, LSD-REGULATORY-RESPONSE). Final shape gated on Bucket 2 #1. |
| B1-M2 | Capability under-count (only 2 cross-cutting capabilities linked) | Author legal-specific capabilities (proposed: LEGAL-INTAKE-TRIAGE, LEGAL-MATTER-MGMT, LEGAL-HOLD-MGMT, LEGAL-EDISCOVERY, OUTSIDE-COUNSEL-MGMT, REGULATORY-RESPONSE) plus keep the existing two. Gated on Bucket 2 #1. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | B12 | Zero `data_object_lifecycle_states` rows on any of the 8 masters. | Author state machines per master. Anchor `domain_module_id` per Rule #14 once M1 lands; gated on Bucket 2 #1. |
| B1-S3 | A4 | `domains.catalog_tagline` and `catalog_description` empty. | Author per Rule #20 (buyer voice). Surface drafts to user before write. |
| B1-S4 | B4 | `legal_advice_records.has_personal_content` and `outside_counsel_engagements.has_single_approver` still default-false. (`legal_holds.has_submit_lock=true` already cured.) | Per-master review surfaced in Bucket 2 #4. |
| B1-S5 | F1 / naming | Legacy domain-level `lsd-system` skill (id 82, kebab + system suffix) present; must retire after per-module system skills land. | Gated on B1-M1. Author one `<module_code_lower>_agent` skill per LSD module; migrate 10 skill_tools to per-module skills; DELETE skill 82. |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | All 14 cross-domain handoffs touching LSD carry NULL `source_domain_module_id` (when LSD is source: 11) or NULL `target_domain_module_id` (when LSD is target: 3) on the LSD side. | Cascades from B1-M1. After modules exist, run deterministic backfill via [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts) pattern. |
| B1-B2 | Trigger_event 1045 `outside_counsel.engaged` has zero subscribers. | Likely real B9 gap. Candidate subscribers: SPEND-MGMT (accrual / engagement-letter spend tracking), CLM (engagement letter as a contract), GRC (conflict-check obligations). Surface as multi-target fan-out; user picks. |

#### APQC TAGGING (H1)

Handoff 807 (HCMS to LSD on `editorial_workflow.review_required`) remains the **single** untagged cross-domain handoff. The 2026-05-30 audit deferred this handoff to Discover Pass 3 / Bucket 2 #5 routing decision (suspicious inbound: payload is source-mastered `editorial_workflows`, not `legal_intake_requests`). Tagging is blocked until the routing call is made.

Counts: **0 new agent_curated proposals in this audit pass** (all 11 from 2026-05-31 continuation already loaded; handoffs 300 + 824 also already tagged with agent_curated rows). Volume against 0.5N to 0.8N target: N=14; existing 13 of 14 = 92.9% process-health coverage. **B1-H1 effectively cured at process level; remaining catalog-quality work is reviewer approval, not new tags.**

### Bucket 2, Surface-for-user (judgment calls)

1. **LSD module shape.** Unchanged gating decision. Options (a) 5 modules (recommended), (b) 4 modules, (c) 6 modules (add LSD-KNOWLEDGE), (d) LSD-FULL single module. **This decision blocks B1-M1 / B1-M2 / B1-S1 / B1-B1 / B1-S5.**
2. **`legal_contracts` necessity demotion.** Currently `consumer + required` from CLM. Per Rule #16 reading: contracts carry workflow (not infrastructure), so `required` may stand. Confirm or demote to `optional`.
3. **Knowledge-management surface for legal.** KNOWLEDGE-MGMT linked but no realizing LSD module. Options: (a) author legal-specific `legal_knowledge_articles` master in new LSD-KNOWLEDGE module, (b) consume cross-cutting `knowledge_articles` master as `consumer` row, (c) drop the capability link.
4. **Pattern flags review.** Remaining proposed flips: `legal_advice_records.has_personal_content=true` (privilege), `outside_counsel_engagements.has_single_approver=true` (GC sign-off). `legal_holds.has_submit_lock` already true.
5. **Suspicious inbound handoffs** (300 RE-PROP-MGMT to LSD, 807 HCMS to LSD). Both carry source-mastered payload; wrong shape for intake-creation handoff. Options per row: (i) reroute target to source's internal-legal module, (ii) repaint payload as `legal_intake_requests`, (iii) delete as misrouted. Likely (ii) once LSD-INTAKE-PORTAL exists.
6. **Pairwise reconciliation depth.** Re-run pairwise after B1-M1 lands (recommended), or accept abbreviated form now.

### Bucket 3, Phase 0 pending (speculative)

| ID | Candidate | Vendor evidence | Notes |
|---|---|---|---|
| B3-1 | `matter_assignments` (LSD-MATTER-MGMT) | LawVu (Assignments), Onit (Matter Team), Litera (Matter Members) | Typed assignment row separating matter's owner from collaborators. |
| B3-2 | `engagement_letters` (LSD-OUTSIDE-COUNSEL) | Litera, Onit, LawVu | Distinct from outside_counsel_engagements and legal_contracts. |
| B3-3 | `regulatory_inquiry_responses` (LSD-REGULATORY-RESPONSE) | LawVu, Onit | Typed response packages per inquiry. |
| B3-4 | B9 fan-out for trigger_event 1045 `outside_counsel.engaged` | absent today | Likely fan-out to SPEND-MGMT, CLM, GRC. |
| B3-5 | B9 candidate `ediscovery_request.produced` to AUDIT | mirror of cross-rel 377 | Evidence package handoff. |
| B3-6 | GRC to LSD inbound on `compliance_obligation.opened` | mirror direction of existing LSD to GRC | Matter-creation trigger from regulatory obligation. |

### Cross-bucket dependencies

- **Bucket 1 is gated by Bucket 2 #1.** B1-M1 / B1-M2 / B1-S1 / B1-B1 / B1-S5 all require module shape resolved first.
- B1-S3 (catalog UX), B1-S4 (pattern flags), B1-B2 (outside_counsel.engaged fan-out) are independent of Bucket 2 #1.
- Bucket 2 #3 (knowledge surface), #5 (suspicious inbounds) are informed by Bucket 2 #1.
- Bucket 3 #1-3 are entity-level candidates whose module hosts depend on Bucket 2 #1.
- Bucket 3 #4-6 are handoff candidates independent of Bucket 2 #1.

### Per-bucket prompts

- **Bucket 1:** "Approve the 8 in-scope fixes once Bucket 2 #1 resolves module shape. Reply 'all', 'just <ids>', or 'skip'. The 3 fixes not dependent on module shape (B1-S3 catalog UX drafts, B1-S4 pattern flags, B1-B2 outside-counsel fan-out targets) can ship first if you want a quick win."
- **Bucket 2:** "Per item: (1) which module shape (a/b/c/d)? (2) demote `legal_contracts` necessity to optional or keep required? (3) which knowledge-management approach (a/b/c)? (4) approve the 2 remaining pattern-flag patches as proposed? (5) per row 300 + 807: reroute, repaint payload, or delete? (6) rerun pairwise after B1-M1, or accept abbreviated now?"
- **Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which of B3-1 through B3-6 to treat as confirmed."

### Report-only follow-ups (owed by other domains)

- **HCM B10b**: handoffs 913, 1032 carry NULL `target_domain_module_id` on HCM side.
- **ECM B10b**: handoffs 911, 912, 915, 1028, 1031 (outbound) and 824 (inbound) carry NULL on ECM side.
- **AUDIT B10b**: handoffs 914, 916, 1029 carry NULL on AUDIT side.
- **GRC B10b**: handoff 1030 carries NULL on GRC side.
- **GRC B9 candidate**: `compliance_obligation.opened` to LSD-MATTER-MGMT.
- **RE-PROP-MGMT**: handoff 300 ownership review.
- **HCMS**: handoff 807 ownership review (single remaining LSD H1 gap).
- **LEGAL-PRACT-MGMT scope boundary**: 5 LEGAL-PRACT-MGMT roles (LEGAL-COUNSEL, LEGAL-ATTORNEY, LEGAL-PARALEGAL, LEGAL-CONFLICTS-PARTNER, LEGAL-OFFICE-MGR) don't currently bundle LSD modules. LSD will need its own in-house persona set once modules exist.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
