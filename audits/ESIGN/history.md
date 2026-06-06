# ESIGN audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` rows (M1 hard fail). 0 `capability_domains` rows (A2 hard fail). 0 `solution_domains` rows (A3 hard fail). 1 `domain_data_objects` row with `role=master, necessity=required` on `envelopes` (251). 1 cross-module DMDO from CLM-REPOSITORY (127) consuming `envelopes` as `consumer + optional`. 0 `domain_regulations` rows. 1 master data_object (`envelopes`, id 251, kind `domain_owned`, `is_canonical_bare_word=true` with rationale, `has_submit_lock=true`, `has_personal_content=false`, `has_single_approver=false`). 8 lifecycle states on `envelopes` (draft, sent, delivered, partially_signed, completed, declined, voided, expired), 1 state with `requires_permission=true` (`sent` with `permission_verb_override=send_envelope`), `domain_module_id=null` on every state. 1 trigger_event (177 `envelope.completed`, `event_category=lifecycle`). 1 outbound cross-domain handoff (217 ESIGN to CLM on `envelope.completed`, payload `envelopes`, `source_domain_module_id=null`, `target_domain_module_id=127` CLM-REPOSITORY, `integration_pattern=api_call`, `friction_level=low`). 0 inbound cross-domain handoffs. 1 cross-domain `data_object_relationship` (518 `envelopes yields signature_records`, signature_records mastered by CLM). 0 aliases. 1 legacy domain-level system skill (`esign-system`, id 20, `skill_type=system`, `domain_module_id=null`, F1 transitional). 6 `skill_tools` rows on skill 20 (`query_envelopes`, `create_envelope`, `send_envelope`, `void_envelope`, `sign_document` external side_effect, `send_email` platform side_effect). 0 ESIGN roles, 0 ESIGN permissions, 0 `business_function_capabilities`. 5 `business_function_domains` rows (owner Contract Operations; contributors Sales, HR, Procurement; consumer Customer Success). `catalog_tagline` and `catalog_description` both empty (A4 hard fail). 1 APQC handoff_processes tag on handoff 217 (process 1135 "Manage IT projects and services interdependencies" L4, `agent_curated`, `record_status=new`); the tag is implausible on its face (e-signature completion is not an IT-projects activity).
- **Vendor-surface basis (Pass 2 flagship enumeration):** DocuSign eSignature, Adobe Acrobat Sign, Dropbox Sign (HelloSign), PandaDoc, SignNow (airSlate), OneSpan Sign. Loaded as `solutions`: DocuSign eSignature (638), Adobe Acrobat Sign (639). Loaded as `vendors`: DocuSign (75), Adobe (195), OneSpan (336), airSlate (338), PandaDoc (340). Compliance-specialist anchors: eIDAS (EU qualified e-signature, regulation 34), FDA 21 CFR Part 11 (life sciences e-records, regulation 22), ESIGN Act / UETA (US, not yet loaded as regulations).
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CLM | 1 | 0 | 1 (CLM-REPOSITORY 127 consumer + optional on envelopes) | 1 (envelopes yields signature_records, signature_records mastered by CLM-REPOSITORY) | 3 | Pairwise (full) |

No other domain currently has handoffs, DMDO links, or cross-relationships against ESIGN's surface. Single neighbor of any weight is CLM. Every other ESIGN consumer hypothesized below (ATS offer letters, S2P contract envelopes, RE-CRE lease execution, HCM onboarding paperwork) is currently un-wired in the catalog and surfaces as Bucket 3 candidates.

**Structural pass bands:** **M1 hard fail** (0 modules). **A2 hard fail** (0 capabilities). **A3 hard fail** (0 solution_domains). **A4 hard fail** (empty `catalog_tagline` and `catalog_description`). **B1 hard fail at the rollup level** (1 master is below the typical ≥1 floor but technically passes B1; the bigger gap is B-band substrate: 0 aliases, 0 `domain_regulations`, 0 user-edges in `data_object_relationships`). **B7 hard fail** (0 `users` to `envelopes` relationship rows; envelopes has actors: sender, signer, witness). **B10b in-scope fail** (handoff 217 `source_domain_module_id` is NULL; the fix is ESIGN's once a module exists). **B11 fail** (zero aliases on a master where vendor terminology varies: agreement, signing_session, transaction). **B12 partial-fail** (lifecycle states loaded but only `sent` has `requires_permission=true`; published-verb states like `voided`, `declined`, `expired`, `completed` need re-evaluation for workflow gates; all states have `domain_module_id=null` which becomes an M5 fix once the module exists). **C1 pass** (Contract Operations is owner). **C2 vacuous** (no capabilities). **E1 vacuous** (single-module domain ceiling per Rule #14, but only after M1 is cured). **F1 transitional** (legacy `esign-system` skill 20 is acceptable ONLY while no module-level system skill exists; after M1 is cured F1 becomes a hard fail until skill 20 is re-anchored or retired). **F2 hard fail** (will trigger after M1 cure; module-level system skill is required). **F3 conditional pass** (skill 20 has 6 `skill_tools` rows). **F4 pass** (every `skill_tools` tool's `operation_kind` agrees with `data_object_id` shape). **F5 uncomputable per module** (no modules; will be computable after M1 cure). **F7 reviewable** (`sign_document` and `send_email` skill_tools carry justifying notes; per Rule #15 the auto-populated wording is suspect, surface to user). **H1 fail** (1 of 1 cross-domain handoffs tagged, but the existing tag points at an implausible PCF row).

ESIGN Semantius score (strict, on the legacy domain-level skill): approximately 67% (4 of 6 `skill_tools` rows on `coverage_tier=platform`; `sign_document` is `external`, `send_email` is `platform`). The two external-tier surfaces are the cryptographic signing primitive (third-party platform owns the kernel: DocuSign / Adobe Sign) and the email delivery channel (which IS the workflow vehicle in this market). Operational score requires `integration` tier promotions on those externals; not on offer today.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail (Rule #14)** | ESIGN has zero `domain_modules` rows. The `domains` row exists with full Rule #8 metadata but is not deployable. Capability count is 0 (A2 fail), so the M2 ≥2-module floor is vacuous; the M1 floor of ≥1 full module still applies and is breached. | Author 1 `domain_modules` row `ESIGN-SIGNATURE-OPS` with `module_kind=full`, `domain_id=94`. Module covers the whole ESIGN surface (envelope authoring, identity verification, signing workflow, audit trail). On the same load, author the master DMDO row: `domain_module_data_objects(domain_module_id=<new>, data_object_id=251, role=master, necessity=required)`. M5 follow-up: PATCH all 8 `data_object_lifecycle_states` for `envelopes` to set `domain_module_id=<new>`. |
| B1-S2 | **A2 hard fail (Rule #14 capability floor)** | ESIGN has zero `capability_domains` rows. The ≥3-row pass floor is breached. | Author ≥3 capabilities: `ESIGN-ENVELOPE-PREP` (envelope authoring, template management, recipient sequencing), `ESIGN-IDENTITY-VERIFY` (signer identity verification: knowledge-based authentication, ID upload, SMS, qualified e-signature), `ESIGN-AUDIT-TRAIL` (cryptographic audit trail, certificate of completion, evidence package), plus `ESIGN-SIGNING-WORKFLOW` (in-person, remote, embedded, bulk send routing). Load `capability_domains` rows linking each to ESIGN (94). Link all 4 to the new `ESIGN-SIGNATURE-OPS` module via `domain_module_capabilities` (M4 + M6 closure). |
| B1-S3 | **A3 hard fail** | ESIGN has zero `solution_domains` rows. Two existing solutions in the catalog (`DocuSign eSignature` 638, `Adobe Acrobat Sign` 639) are not linked. | Insert `solution_domains` rows linking 638, 639 to ESIGN with `coverage_level='primary'`. Also: load Dropbox Sign / HelloSign, PandaDoc (vendor 340 exists), SignNow / airSlate (vendor 338 exists), and OneSpan Sign (vendor 336 exists) as new solutions, then link them with `coverage_level='primary'`. Target ≥5 solutions, ≥3 primary. |
| B1-S4 | **B7 hard fail** | Zero `data_object_relationships` rows from `users` (id 748, platform_builtin) to `envelopes` (id 251). Envelope workflow has explicit user-typed actors: sender / preparer, signer (often multiple), CC viewer. | Author `data_object_relationships` rows from `users` to `envelopes` for `sender` and `signer` roles per Rule #10. (Bulk-recipient and witness shapes can come in a follow-up load.) |
| B1-S5 | **B10b in-scope (Rule #B10b)** | Handoff 217 (ESIGN to CLM on `envelope.completed`) carries `source_domain_module_id=null`. Fix is in-scope once B1-S1 lands. | PATCH `handoffs.id=217` to set `source_domain_module_id=<new ESIGN-SIGNATURE-OPS id>` once B1-S1's module exists. |
| B1-S6 | **B11 fail** | Zero aliases on `envelopes`. Non-DocuSign vendors call the same concept by different names: Adobe Acrobat Sign uses `agreement`, PandaDoc uses `document`, SignNow uses `transaction`, in-person signing flows use `signing session`. Bare-word `envelopes` is canonical (claim is loaded with rationale) but Rule #B11 still expects the cross-vendor synonyms. | Insert `data_object_aliases` rows for `agreement`, `signing_session`, `transaction` (alias_type follows the catalog enum; sniff `/fields?table_name=eq.data_object_aliases&field_name=eq.alias_type` at fix time for the allowed set). |
| B1-S7 | **B12 partial-fail (Rule #12 lifecycle re-evaluation)** | 8 lifecycle states exist on `envelopes`, but only `sent` has `requires_permission=true`. Published-verb terminal / state-change states warrant re-evaluation: `voided` (the void action is a workflow gate, currently `void_envelope` is implemented as a tool but no lifecycle gate), `declined` (signer-initiated reject), `expired` (clock-triggered, typically no gate), `completed` (system terminal, typically no gate). | PATCH `voided` state: `requires_permission=true`, `permission_verb_override='void_envelope'`, `domain_module_id=<new>`. The author may also choose to add a gate on `declined` if a recipient-decline action needs operator authorization; surface to Bucket 2 if uncertain. After B1-S1 also PATCH every state's `domain_module_id=<new>` (M5 closure). |
| B1-S8 | **F1 (post-B1-S1, paired step)** | Legacy `esign-system` skill (id 20, `domain_id=94`, `skill_type=system`, `domain_module_id=null`) is in the transitional state Rule #F1 allows ONLY while no module-level system skill exists. Once B1-S1 authors `ESIGN-SIGNATURE-OPS`, the legacy row becomes a fail. | Two paths: (a) re-anchor skill 20 by PATCHing `domain_module_id=<new>` and `skill_name='esign_signature_ops_agent'`, keeping the existing 6 `skill_tools` rows in place (preferred, preserves the tool linkage); (b) author a new skill against the module and DELETE skill 20 along with cascade. Path (a) is one PATCH; path (b) is destructive and re-binds. |
| B1-S9 | **Domain regulations missing (A-band substrate)** | Zero `domain_regulations` rows; eIDAS (34) and FDA 21 CFR Part 11 (22) are both clearly applicable and already loaded in the catalog. ESIGN Act and UETA are not yet loaded as regulations and need a Phase 0 vetting (Bucket 3 candidates). | Insert 2 `domain_regulations` rows: (94, 34, applicability per the regulation's scope in the EU) and (94, 22, applicability per FDA-regulated electronic records). The two unloaded US regulations (ESIGN Act, UETA) ride on Bucket 3. |
| B1-S10 | **H1 hard fail (APQC tagging)** | Handoff 217 carries 1 `handoff_processes` row pointing at process 1135 "Manage IT projects and services interdependencies" L4 (`record_status=new`, `proposal_source=agent_curated`). The tag is implausible: e-signature envelope completion is not an IT-projects-interdependencies activity. The strong PCF match is process 398 "Negotiate and document agreements/contracts" L3 (external_id 11052) which sits under PCF 4.0 "Manage Customer Service" parent. Alternate candidates: process 165 "Select suppliers and develop/maintain contracts" L3 (10278) for sourcing-side envelopes. | REPLACE the existing `handoff_processes` row 204: PATCH `process_id=398` (keep `proposal_source=agent_curated`, keep `record_status=new`). Single mechanical PATCH. |
| B1-S11 | **B5 / B7 envelopes integrity** | `envelopes yields signature_records` (relationship 518) is the only cross-domain edge and it's correct (signature_records mastered by CLM). No B5 orphan. (No fix needed; reported as positive.) | None. |
| B1-S12 | **Cross-domain relationships report-only (B8 outbound from ESIGN, all owed by other domains for inbound mirrors)** | ESIGN publishes 1 outbound cross-relationship (518). Inbound relationship coverage is sparse (zero rows): in the market shape there should be inbound edges from `legal_contracts triggers envelopes` (CLM), `crm_opportunities triggers envelopes` (CRM), `job_offers triggers envelopes` (ATS), `engagement_letters triggers envelopes` (LEGAL-PRACT-MGMT / ACCT-PRACT-MGMT), `purchase_orders triggers envelopes` (S2P), `commercial_leases triggers envelopes` (RE-CRE), `customer_subscriptions triggers envelopes` (SUB-MGMT). The inbound side is owed by each source domain's B8 pass. | Report-only. See "Report-only follow-ups" section. |

#### APQC TAGGING (count, in-scope)

ESIGN has 1 cross-domain handoff (217). H1 expectation is approximately 0.5N to 0.8N agent_curated tags = 1 tag for N=1. The existing tag is already `agent_curated` but points at an implausible PCF row (process 1135 L4). The B1-S10 REPLACE candidate is in-scope and counts as 1 APQC tag in this audit.

| handoff_id | source to target | trigger_event | payload | Current PCF row | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|---|
| 217 | ESIGN to CLM-REPOSITORY | `envelope.completed` | `envelopes` | 1135 "Manage IT projects and services interdependencies" (20689 L4) | 398 "Negotiate and document agreements/contracts" (11052 L3) | 398 | confident L3 |

Combined APQC count (REPLACE candidate) = 1.

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M1 + A2 + A3 + B7 + B11 + B12 + F1 transitional + Domain regulations missing) | 8 |
| BOUNDARY (B10b in-scope) | 1 |
| APQC TAGGING | 1 |
| Pairwise consumer DMDOs report-only | 1 (covered under B1-S12) |
| MISSING (none separable from M1 / A2 / A3 STRUCTURAL above) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| MODULARIZATION ISSUES | 0 |
| **Bucket 1 total (distinct B1-S*/B1-H1 items)** | 14 |

The Bucket 1 ID count includes B1-S1 through B1-S12 (12) plus the count line for B1-S10 (APQC TAGGING is a single line item with 1 sub-tag, per the constraint #10 convention) and an additional B1-S13 / B1-S14 entries below.

| ID | Description |
|---|---|
| B1-S1 | Author `ESIGN-SIGNATURE-OPS` module + master DMDO + 8 lifecycle-state `domain_module_id` PATCHes |
| B1-S2 | Author 4 capabilities + `capability_domains` + `domain_module_capabilities` |
| B1-S3 | Author / link ≥5 solutions to ESIGN with `coverage_level` |
| B1-S4 | Author users to envelopes B7 relationship rows (sender, signer) |
| B1-S5 | PATCH handoff 217 `source_domain_module_id=<new module>` |
| B1-S6 | Author 3 aliases on envelopes (agreement, signing_session, transaction) |
| B1-S7 | PATCH `voided` state `requires_permission=true`; PATCH every state's `domain_module_id` after B1-S1 |
| B1-S8 | Re-anchor legacy skill 20 to the new module (preferred PATCH path) |
| B1-S9 | Insert 2 `domain_regulations` rows for EIDAS (34) and FDA-21CFR11 (22) |
| B1-S10 | REPLACE APQC tag on handoff 217: PATCH `handoff_processes.id=204` to `process_id=398` |
| B1-S11 | Positive finding (no fix), envelopes yields signature_records cross-relationship is correct |
| B1-S12 | Report-only (B8 inbound mirrors owed by CLM, CRM, ATS, LEGAL-PRACT-MGMT, ACCT-PRACT-MGMT, S2P, RE-CRE, SUB-MGMT B8 passes) |
| B1-S13 | Once B1-S1 lands, run M4 / M6 closure: every new capability has ≥1 realizing module link, every module realizes ≥1 capability (mechanical given B1-S2) |
| B1-S14 | Once B1-S1 lands, run M5 closure on the workflow-gate state: PATCH `sent` (and `voided` from B1-S7) `domain_module_id=<new>` so permission materialization prefixes correctly per Rule #M5 |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**CLM to ESIGN (weight 3).** Wired pairs: 1 outbound (217 ESIGN to CLM on `envelope.completed`). Section 1 (existing fully wired): 0 (217 has NULL `source_domain_module_id`, this domain's fix per B10b). Section 2 (NULL FK candidates): 217 itself, fix is B1-S5. Section 3 (missing handoffs the catalog implies): a candidate is CLM to ESIGN on `legal_contract.sent_for_signature` (an event that does not yet exist on `legal_contracts`); the cross-relationship in the inverse direction (`legal_contracts triggers envelopes`) is also missing from `data_object_relationships`. CLM-REPOSITORY consumes envelopes as `consumer + optional` (DMDO 127), but the publisher direction `legal_contracts to envelopes` is not encoded. This is a CLM B8 outbound miss (CLM owes the relationship row on its outbound side). Section 4 (boundary integrity): CLM's `consumer + optional` on envelopes mirrors Rule #16 infrastructure-master treatment for an embedded ESIGN flow (optional means CLM can run without ESIGN deployed); coherent. Section 5 (cross-relationship mirror): the existing relationship 518 (`envelopes yields signature_records`, owner_side=source=ESIGN) is the correct outbound shape; the inverse mirror `signature_records produced_by envelopes` is NOT typically loaded (owner_side captures the directionality). Healthy.

Lighter neighbors: none. ESIGN has no other catalog-recorded neighbors today, which is itself a finding (every domain that ships paperwork through envelopes should at least be a Bucket 3 candidate; see Bucket 3 below).

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **A4 catalog tagline / catalog description authoring.** Per Rule #20, both `domains.catalog_tagline` and `domains.catalog_description` need buyer-voice copy (workflow + value). The agent can draft, but the buyer-facing wording is editorial and Rule #20 requires user review BEFORE writing. | Marketing voice judgment, user owns the wording. | (a) User supplies the exact `catalog_tagline` (single sentence) and `catalog_description` (1-3 paragraphs). (b) User asks the agent to draft, surface in chat, approve verbatim, then write. Either way, the agent does not write before user approval. |
| B2-S2 | **Module split decision.** B1-S1 proposes a single `ESIGN-SIGNATURE-OPS` module covering envelope-prep, identity verification, signing workflow, and audit trail. A defensible alternative is a 2-module split: `ESIGN-AUTHORING` (template + envelope prep + recipient sequencing) and `ESIGN-COMPLETION` (signing + identity verification + audit trail + certificate). The 2-module split unlocks Rule #14 role bundling (E1 needs ≥2 modules for any role to clear the 2-module floor), but requires authoring ≥4 capabilities (B1-S2 already proposes 4) and ≥2 system skills. | Module-shape design call: single workflow market vs. two-phase workflow market. ESIGN as a point-solution market typically ships single product (DocuSign eSignature is one app). Recommendation: single module. | (a) Single module `ESIGN-SIGNATURE-OPS` (default). (b) Two-module split `ESIGN-AUTHORING` + `ESIGN-COMPLETION` (more substrate, unlocks roles, more authoring work). |
| B2-S3 | **F7 channel-primitive justification (Rule #15).** `skill_tools` row for skill 20 + tool 42 (`sign_document`, external) has notes "The defining action, entire purpose of an ESIGN skill". Row for tool 37 (`send_email`, platform) has notes "Envelope invitations + signing-completion notifications". Per Rule #15 these notes were almost certainly auto-populated. Per Rule #F7 a justification IS required if the row is kept (sign_document IS the workflow, defensible; send_email IS the channel because email IS the e-signature invitation contract in this market). | Rule #15 vs F7 boundary judgment. The user has to either approve the exact notes wording, or treat F7 as satisfied via this audit conversation (record the decision here). | (a) Confirm both notes are user-approved-as-loaded (leave in place). (b) Confirm auto-populated and revert: PATCH both rows' `notes` to empty string; treat F7 satisfied via this audit. (c) Supply user-approved wording for each. |
| B2-S4 | **B12 lifecycle-gate scope on declined and expired.** B1-S7 proposes `voided` should be a workflow gate (`requires_permission=true`). Question for the user: should `declined` and `expired` ALSO carry gates? `declined` is signer-initiated (recipient action, not operator); `expired` is clock-triggered (no operator action). Typical e-signature platforms do NOT gate either, the gate exists only on operator-initiated voids. Recommendation: gate only `voided`. | Workflow-shape judgment; user owns the call. | (a) Gate only `voided` (default). (b) Also gate `declined` (operator decline scenario). (c) Also gate `expired` (operator-triggered expiration). |
| B2-S5 | **B7 user-edges scope.** B1-S4 proposes `sender` and `signer` `data_object_relationships` rows. Should additional roles be loaded: `witness` (notarization flows, some e-signature platforms support witnesses), `bulk_recipient_template_owner` (bulk send), `cc_viewer` (signer convenience), `verifier` (identity-verification reviewer in qualified e-signature flows)? Or are these "load when the workflow demands" extras? | Workflow-shape judgment; user owns the call. The catalog rule is "every user-typed actor has an edge"; the question is which actors are first-class at this scope. | (a) Load only sender + signer (default). (b) Also load witness. (c) Also load cc_viewer. (d) Also load verifier. (e) Combination (specify). |
| B2-S6 | **Rule #15 notes-pollution on `envelope.completed` trigger event 177.** Trigger event 177 carries a populated `description`: "An e-signature envelope has been fully signed by all required parties. Downstream: CLM persists the signed contract via signature_records; HR persists offer letters; sales-ops triggers commission and quota effects." Description columns are technically NOT notes columns (Rule #15 watch the boundary), but the trailing "Downstream..." sentence narrates handoff destinations, which IS what notes-pollution looks like. The first sentence is correct event-description content; the trailing sentence is closer to a notes-trailer. | Rule #15 boundary judgment for `trigger_events.description`. The user owns the call. | (a) Keep the description as-is (description column has more license than notes). (b) PATCH the description to the first sentence only: "An e-signature envelope has been fully signed by all required parties." (default if Rule #15 is read strictly). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 reviewed the substrate against DocuSign eSignature, Adobe Acrobat Sign, Dropbox Sign (HelloSign), PandaDoc, SignNow (airSlate), and OneSpan Sign. Compliance anchor: eIDAS, FDA 21 CFR Part 11. US-statutory anchors NOT yet loaded as `regulations`: ESIGN Act (15 USC ch. 96), UETA (Uniform Electronic Transactions Act). Also relevant for qualified e-signature: ANSI Z21, ISO 32000 (PDF), ITU X.509 (PKI).

The subagent recipe was not spawned (this is a single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate gap for Phase 0 verification, not a vetted finding.

#### MISSING entity / capability / regulation candidates (6) surfaced by flagship-vendor knowledge

| Candidate | Vendor knowledge basis | Proposed module / table | Class |
|---|---|---|---|
| `signature_certificates` | DocuSign Certificate of Completion, Adobe Acrobat Sign Audit Report, PandaDoc Audit Trail. The PKI signature + audit trail bundle is often modeled as a distinct record (the long-lived evidence package). Currently NOT in catalog. | new entity, ESIGN-SIGNATURE-OPS (master), `domain_owned`, kind = `domain_owned` | entity |
| `envelope_templates` | DocuSign Templates, Adobe Acrobat Sign Templates, PandaDoc Templates. Reusable envelope blueprints with recipient roles, field placements, default expiration. Currently NOT in catalog (templates concept is folded into `contract_templates` over in CLM, but ESIGN templates are a distinct envelope-prep concept). | new entity, ESIGN-SIGNATURE-OPS (master), `domain_owned` | entity |
| `identity_verifications` | DocuSign Identity Verification (knowledge-based / ID upload / SMS / qualified e-signature), Adobe Acrobat Sign Identity Verification, OneSpan Sign Notary. Per-signer identity-verification attempt records (challenge / response / outcome). Currently NOT in catalog. | new entity, ESIGN-SIGNATURE-OPS (master) | entity |
| `ESIGN-NOTARY` capability / module candidate | DocuSign Notary, OneSpan Notary, Notarize.com, BlueNotary, NotaryCam. Online notarization is a regulated layer on top of e-signature (Remote Online Notarization, RON). Some states (Virginia, Florida, Texas) have specific RON statutes. Adjacent enough to ESIGN that it might be a capability rather than a separate domain; the user picks. | new capability `ESIGN-NOTARY` linked to ESIGN, or candidate domain `ESIGN-NOTARY` if vendor research treats notarization as a separate market | capability or candidate domain |
| `ESIGN Act` / `UETA` regulations | Not yet in catalog. US statutory anchors for legal-binding e-signature in non-EU jurisdiction (federal ESIGN Act 2000; state-level UETA 1999). FDA 21 CFR Part 11 covers life sciences; ESIGN Act covers everything else. | new `regulations` rows | regulation |
| Cross-domain handoffs ESIGN does not currently consume | Inbound handoffs that flagship usage implies but are NOT in the catalog: CRM `crm_opportunity.closed_won` to ESIGN (envelope-creation), ATS `job_offer.extended` to ESIGN (offer-letter envelope), LEGAL-PRACT-MGMT `engagement_letter.drafted` to ESIGN, S2P `purchase_order.issued` to ESIGN (PO envelope), HCM `onboarding_doc.assigned` to ESIGN (onboarding paperwork), RE-CRE `commercial_lease.drafted` to ESIGN, SUB-MGMT `customer_subscription.contract_drafted` to ESIGN. None currently wired; cross-relationship inverses (e.g. `legal_contracts triggers envelopes`) also missing. | cross-domain handoffs + `data_object_relationships` rows authored on each source domain's B9 / B8 pass | handoffs + relationships (other domains' work) |

#### MODULARIZATION candidates (1)

- **2-module split ESIGN-AUTHORING + ESIGN-COMPLETION.** Already raised as B2-S2. Listed here for completeness as a Phase 0 candidate: market research could verify whether flagship vendors model the two phases as architecturally separable (DocuSign's product split is between eSignature and CLM, not between envelope-authoring and signing-completion). Likely verdict: single module is correct for an ESIGN-as-point-solution market.

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md`. Every MISSING candidate above is an entity, capability, regulation, or cross-domain edge extension; none rises to a new domain-tier market. (Online notarization is the closest candidate but is typically a capability layer on top of ESIGN rather than a separate point-solution market; verify in Phase 0 if the user wants.)

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (Phase 0 markdown at `c:/tmp/ESIGN-phase0-2026-05-30.md` would confirm per-entity vendor coverage) or eyeball-mode (user names which of the 6 candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S2, S5, S7, S8, S13, S14 all depend on B1-S1.** The capability links, the source-module FK patch on handoff 217, the M5 closure on lifecycle states, the F1 transitional fix on skill 20, and the M4 / M6 closures all need the new module id from B1-S1 first.
- **B1-S3 (solutions) is INDEPENDENT of B1-S1.** Solution linking is at the domain level; can run before, with, or after the module load.
- **B1-S4 (B7 user edges) is INDEPENDENT of B1-S1.** Relationships are at the data_object level; no module FK needed.
- **B1-S6 (aliases) is INDEPENDENT of B1-S1.** Aliases are at the data_object level.
- **B1-S9 (domain regulations) is INDEPENDENT of B1-S1.** Regulations link at the domain level.
- **B1-S10 (APQC REPLACE) is INDEPENDENT of B1-S1.** The handoff and process both already exist.
- **B2-S2 (single vs two-module split) gates B1-S1.** Until the user picks (a) or (b), the M1 load cannot proceed. Recommend resolving B2-S2 first.
- **B2-S1 (A4 catalog UX) is INDEPENDENT of all other Buckets.** Pure editorial.
- **B2-S4 (lifecycle gate scope) feeds B1-S7.** User answer shapes which states get `requires_permission` patched.
- **B2-S5 (user-edge scope) feeds B1-S4.** User answer shapes which user edges get loaded.
- **B2-S6 (Rule #15 description revert) is INDEPENDENT.**
- **B3 ESIGN-NOTARY candidate** might inform B2-S2 (a notary capability would still fit inside a single ESIGN-SIGNATURE-OPS module rather than forcing the 2-module split). Calling this out per the surface-time discipline.
- **B3 inbound-handoff candidates** are NOT ESIGN's load to author. They are inputs to other domains' B8 / B9 passes. If the user takes the Phase 0 vetted route, the result feeds into outbound work on CRM, ATS, LEGAL-PRACT-MGMT, S2P, HCM, RE-CRE, SUB-MGMT audits.
- Buckets 2 and 3 are otherwise independent.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S3, S4, S6, S9, S10`), or `skip`.

- **S1 (M1 hard fail, author module + master DMDO + M5 state patches)** is GATED on B2-S2 (single vs two-module decision); resolve B2-S2 first.
- **S2 (4 capabilities + capability_domains + domain_module_capabilities)** depends on S1.
- **S3 (≥5 solutions linked with coverage_level)** is independent; can run today.
- **S4 (B7 sender + signer relationships, possibly more after B2-S5)** is independent; ready once B2-S5 answers.
- **S5 (PATCH handoff 217 source_domain_module_id)** depends on S1.
- **S6 (3 aliases on envelopes)** is independent; can run today.
- **S7 (PATCH `voided` state requires_permission=true; M5 on all states)** depends on S1; scope shaped by B2-S4.
- **S8 (re-anchor skill 20)** depends on S1.
- **S9 (link EIDAS + FDA-21CFR11 regulations)** is independent; can run today.
- **S10 (APQC REPLACE handoff_processes 204 to process_id 398)** is independent; trivial PATCH.
- **S13 / S14 (M4 / M6 / M5 closure)** depend on S1 + S2 + S7.

**Bucket 2, what's your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (A4 catalog UX wording):** supply tagline + description, or ask the agent to draft for review (Rule #20 forbids loading without approval).
- **B2-S2 (single vs two-module split):** (a) single `ESIGN-SIGNATURE-OPS`, (b) two-module `ESIGN-AUTHORING` + `ESIGN-COMPLETION`. Agent recommends (a).
- **B2-S3 (Rule #15 on sign_document + send_email skill_tools notes):** (a) keep, (b) revert + treat F7 satisfied via this audit, (c) supply approved wording.
- **B2-S4 (lifecycle-gate scope):** which states get `requires_permission=true` beyond `sent` + `voided`?
- **B2-S5 (B7 user-edge scope):** load only sender + signer, or add witness / cc_viewer / verifier?
- **B2-S6 (Rule #15 on trigger_event 177 description trailer):** (a) keep description as loaded, (b) PATCH to first sentence only.

**Bucket 3, vet via formal Phase 0 vendor research or eyeball-mode?**

- If eyeball-mode, name which of the 6 candidates to treat as confirmed: (1) `signature_certificates` master, (2) `envelope_templates` master, (3) `identity_verifications` master, (4) `ESIGN-NOTARY` capability or candidate domain, (5) `ESIGN Act` / `UETA` regulations, (6) inbound cross-domain handoff inventory (CRM / ATS / LEGAL-PRACT-MGMT / S2P / HCM / RE-CRE / SUB-MGMT).
- If vetted route, agent runs focused Phase 0 vendor research on ESIGN and produces a confirmed gap list; survivors become Bucket 1 items in a follow-up audit.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain.

| Owing domain | Owed work |
|---|---|
| CLM | B8 outbound: author `data_object_relationships` row for `legal_contracts triggers envelopes` (or equivalent verb). CLM's B8 pass should pick this up. Currently CLM-REPOSITORY consumes envelopes as DMDO `consumer + optional` but no relationship row encodes the publisher direction. |
| CRM | B9 outbound: cross-domain handoff CRM to ESIGN on `crm_opportunity.closed_won` to envelope creation (if the workflow ships paper-based contracting). B8 outbound: `crm_opportunities triggers envelopes` relationship row. |
| ATS | B9 outbound: cross-domain handoff ATS to ESIGN on `job_offer.extended` (offer-letter envelope). B8 outbound: `job_offers triggers envelopes` relationship row. |
| LEGAL-PRACT-MGMT | B9 outbound: cross-domain handoff LEGAL-PRACT-MGMT to ESIGN on `engagement_letter.drafted` or `.sent_for_signature`. B8 outbound: `engagement_letters triggers envelopes` relationship row. |
| ACCT-PRACT-MGMT | Same shape as LEGAL-PRACT-MGMT on `engagement_letter.signed`. |
| S2P | B9 outbound: cross-domain handoff S2P to ESIGN on `purchase_order.issued` or `sourcing_event.awarded`. B8 outbound: `purchase_orders triggers envelopes` or `sourcing_events triggers envelopes` relationship row. |
| HCM | B9 outbound: cross-domain handoff HCM to ESIGN on `onboarding_doc.assigned` or equivalent. B8 outbound: relevant relationship row. |
| RE-CRE | B9 outbound: cross-domain handoff RE-CRE to ESIGN on `commercial_lease.drafted` or `.sent_for_signature`. B8 outbound: `commercial_leases triggers envelopes` relationship row. |
| SUB-MGMT | B9 outbound: cross-domain handoff SUB-MGMT to ESIGN on `customer_subscription.contract_drafted`. B8 outbound: relevant relationship row. |

The decision to schedule these other-domain audits is at the user's discretion. Each is a B8 / B9 outbound miss on the source domain, not an ESIGN load.

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_esign_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_esign_b1_technical_2026_05_31.ts). Run from project root `c:/dev/domain-map`. All four writes succeeded on a clean live state (no prior partial application).

### Applied

- **B1-S4 (B7 user-edges).** Inserted 2 `data_object_relationships` rows from `users` (748) to `envelopes` (251) per Rule #10:
  - `sends envelopes` (relationship_verb), inverse `is_sent_by`, one_to_many, reference, owner_side=source.
  - `signs envelopes` (relationship_verb), inverse `is_signed_by`, one_to_many, reference, owner_side=source.
  - Scope is the audit-default sender + signer pair. Witness / cc_viewer / verifier remain deferred to B2-S5.
- **B1-S7 (B12 voided gate).** PATCHed lifecycle state id 441 (`envelopes.voided`) to `requires_permission=true` and `permission_verb_override='void_envelope'`. The M5 portion (PATCH `domain_module_id` on every state, including `sent` and `voided`) remains deferred until B1-S1 authors the module.
- **B1-S9 (domain regulations).** Inserted 2 `domain_regulations` rows on ESIGN (94): eIDAS (34) and FDA 21 CFR Part 11 (22), both with `applicability='conditional'`. Both are scope-bound: eIDAS binds for EU-context envelopes, FDA 21 CFR Part 11 binds for FDA-regulated electronic records. `mandatory` would over-state coverage for a generic ESIGN deployment.
- **B1-S10 (APQC REPLACE).** PATCHed `handoff_processes` id 204 `process_id` from 1135 (`Manage IT projects and services interdependencies`, L4) to 398 (`Negotiate and document agreements/contracts`, L3, external_id 11052). Computed `key` field recomputed by the BEFORE INSERT/UPDATE trigger to `217.398`. `proposal_source='agent_curated'` and `record_status='new'` preserved.

### Deferred (and why)

- **B1-S1, S2, S5, S8, S13, S14 (module + capabilities + downstream FK / closure fixes).** All gated on B2-S2 (single vs two-module split). Creating the `ESIGN-SIGNATURE-OPS` module, 4 capabilities, source-module FK PATCH on handoff 217, skill 20 re-anchor, M4 / M5 / M6 closures all require user decision first. Module authoring is also out of B1-technical scope (new entities / DMDOs / modules).
- **B1-S3 (solutions ≥5 + coverage_level).** Multiple candidates require vendor judgment (Dropbox Sign, PandaDoc, SignNow, OneSpan Sign to load as new solutions; coverage_level value per row). Audit lists vendor names but does not pre-specify exact tuples for the missing ones, and Rule #18 forbids vendor names in non-commerce text decisions. Deferred to a user-vetted load.
- **B1-S6 (3 envelopes aliases).** Audit says "alias_type follows the catalog enum; sniff `/fields?...alias_type` at fix time for the allowed set" — exact tuples not pre-specified, so deferred per the bulk-aliases rule.
- **B1-S7 M5 portion (PATCH every state's domain_module_id).** Depends on B1-S1 (module does not yet exist). The workflow-gate flip on `voided` itself is applied above.
- **B2-S1 (catalog_tagline / catalog_description).** Rule #20: editorial copy, user-approved wording only.
- **B2-S3 (skill_tools notes revert).** Per Rule #15 only allowed when audit pre-specifies the row IDs to revert; audit names the tools by code (`sign_document`, `send_email`) but does not pre-specify the `skill_tools.id` values, and the choice between (a) keep / (b) revert / (c) supply wording is user judgment.
- **B2-S4, B2-S5, B2-S6.** All explicitly user-decision Bucket 2 questions.
- **B3 (all 6 candidates).** Phase 0 vetting required (new entities / capability / regulations / inbound handoffs that other domains own).
- **Report-only follow-ups.** Owned by CLM / CRM / ATS / LEGAL-PRACT-MGMT / ACCT-PRACT-MGMT / S2P / HCM / RE-CRE / SUB-MGMT audits.

### Live state after run

- `data_object_relationships` count from `users` to `envelopes`: 2 (new this run, both record_status='new').
- `data_object_lifecycle_states` for `envelopes` with `requires_permission=true`: 2 (`sent` send_envelope, `voided` void_envelope). `domain_module_id` still null on all 8 states (M5 deferred).
- `domain_regulations` for domain 94: 2 (eIDAS conditional, FDA 21 CFR Part 11 conditional). Both record_status='new'.
- `handoff_processes` row 204 now points at process 398 (`Negotiate and document agreements/contracts`, L3); `key='217.398'`.

### Errors

None. All four steps completed without retry. No JWT-audience errors.

### Spot-check URLs

- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/data_object_lifecycle_states
- https://tests.semantius.app/domain_map/domain_regulations
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- **Current footprint:** `domains` row 94 (`Electronic Signature`). 0 `domain_modules`. 0 `capability_domains`. 0 `solution_domains`. 1 master data_object (envelopes 251, kind domain_owned, `is_canonical_bare_word=true` with rationale, `has_submit_lock=true`). 8 lifecycle states on envelopes with 2 carrying `requires_permission=true` (`sent` send_envelope, `voided` void_envelope); all 8 states still carry `domain_module_id=null`. 1 trigger_event (177 `envelope.completed`, `event_category=lifecycle`) with a description trailer narrating downstream CLM / HR / sales-ops effects. 1 outbound handoff (217 ESIGN to CLM-REPOSITORY 127 on `envelope.completed`, payload envelopes, `integration_pattern=api_call`, `friction_level=low`, `source_domain_module_id=null`, `target_domain_module_id=127`). 0 inbound handoffs. 1 cross-domain DMDO consumer (CLM-REPOSITORY 127 consumer + optional on envelopes). 3 `data_object_relationships` touching envelopes (1886 users sends envelopes, 1887 users signs envelopes, 518 envelopes yields signature_records). 0 `data_object_aliases`. 1 legacy domain-level system skill (`esign-system` 20, `domain_module_id=null`) with 6 `skill_tools` rows (4 platform, 1 external `sign_document`, 1 platform `send_email`); rows 254 and 255 carry notes ("The defining action, entire purpose of an ESIGN skill" and "Envelope invitations + signing-completion notifications") that still contain em-dash glyphs in row 254. 2 `domain_regulations` (eIDAS 34 conditional, FDA 21 CFR Part 11 22 conditional). 5 `business_function_domains` (owner Contract Operations; contributors Sales, HR, Procurement; consumer Customer Success). 0 ESIGN roles, 0 ESIGN permissions. 1 `handoff_processes` row 204 on handoff 217 pointing at process 398 (`Negotiate and document agreements/contracts`, L3, external_id 11052), `proposal_source=agent_curated`, `record_status=new`. `catalog_tagline` and `catalog_description` both empty. `domains.business_logic` carries an em-dash glyph (project-rule violation).
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

**Vendor surface basis.** This is a structural Validate b1 pass (not a fresh market subagent), so Bucket 3 carries the prior audit's flagship-vendor candidate set unchanged: DocuSign eSignature, Adobe Acrobat Sign, Dropbox Sign (HelloSign), PandaDoc, SignNow (airSlate), OneSpan Sign; compliance anchors eIDAS, FDA 21 CFR Part 11, with ESIGN Act / UETA still un-vetted.

**Structural pass bands (this run).** **S1:** zero rows on `domain_modules`, `capability_domains`, `solution_domains` (each routes to M1 / A2 / A3). **S2 / S3:** vacuous on the module set (no modules); per-master sweep on envelopes shows 8 states / 1 event / 0 aliases (0 aliases routes to B11). **A1 mechanical pass** (all seven business-metadata columns populated), but `business_logic` carries a forbidden em-dash glyph (project-rule fail; surfaces as Bucket 1 STRUCTURAL). **A2 hard fail.** **A3 hard fail.** **A4 hard fail.** **M1 hard fail.** **M2 vacuous** (capability count 0). **M4 / M5 / M6 / M8** blocked by M1. **M7 pass** (single master, no multi-master conflict). **B1 pass** (1 master). **B2 / B3 / B4 / B5 pass.** **B7 pass** (2 user edges from 2026-05-31 continuation). **B9 pass** (event + 1 handoff). **B9b skip** (only one domain module surface, in fact none). **B10b hard fail** (handoff 217 `source_domain_module_id=null`, target side resolved to CLM-REPOSITORY 127). **B11 hard fail** (zero aliases on envelopes despite vendor synonyms agreement / signing_session / transaction). **B12 partial:** 2 of 8 states gated, M5 portion blocked on M1. **C1 pass.** **C2 vacuous.** **D1** UI-spot-check-only. **E1 / E2 / E3 / E4 / E5 vacuous** (single-module-domain ceiling per Rule #14, currently zero modules). **F1 transitional pass** (legacy skill 20 acceptable while no module-level system skill exists). **F2 / F3 / F4 / F5** blocked by M1 cure. **F7 hard fail** (rows 254 + 255 on skill 20 carry notes containing em-dash glyph on 254 plus channel-justification prose Rule #15 forbids without per-row user approval). **H1:** 1 of 1 cross-domain handoffs tagged; **0 approved** (catalog quality headline) versus 1 `agent_curated` (process side-bar). Volume expectation 0.5N to 0.8N agent_curated tags = met by the prior REPLACE; no further tagging proposed this pass.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CLM | 1 | 0 | 1 (CLM-REPOSITORY 127 consumer + optional on envelopes) | 1 (envelopes yields signature_records 70, mastered by CLM) | 3 | Pairwise (full) |

Lighter neighbors: none. Every other consumer hypothesis (ATS offer letters, S2P PO envelopes, RE-CRE lease execution, HCM onboarding paperwork, LEGAL-PRACT-MGMT engagement letters, CRM closed-won, SUB-MGMT contracts) is still un-wired and remains Bucket 3 candidate work owed by those domains' B8 / B9 outbound passes.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-S1 | **M1 hard fail (Rule #14)** | ESIGN still has zero `domain_modules` rows. Gates B1A-S2, S5, S7-M5, S8, S11, S12. | Author 1 `domain_modules` row `ESIGN-SIGNATURE-OPS` (`module_kind=full`, `domain_id=94`) covering envelope authoring, identity verification, signing workflow, audit trail. Same load inserts the master DMDO `(domain_module_id=<new>, data_object_id=251, role=master, necessity=required)`. Gated on Bucket 2 single-vs-two-module decision (B2-S2). |
| B1A-S2 | **A2 hard fail (Rule #14 capability floor)** | 0 `capability_domains` rows. ≥3 floor breached. | Author ≥3 capabilities (`ESIGN-ENVELOPE-PREP`, `ESIGN-IDENTITY-VERIFY`, `ESIGN-AUDIT-TRAIL`, `ESIGN-SIGNING-WORKFLOW`), `capability_domains` to ESIGN (94), and `domain_module_capabilities` to the new module. Closes M4 + M6 once S1 lands. |
| B1A-S3 | **A3 hard fail** | 0 `solution_domains`. DocuSign eSignature (638) and Adobe Acrobat Sign (639) sit unlinked. | Insert `solution_domains` rows for 638 and 639 (`coverage_level=primary`). Authoring of additional solutions plus their per-row coverage_level remains Bucket 2 (vendor judgment). |
| B1A-S4 | **A1 / project-rule em-dash violation on `domains.business_logic`** | The live row carries a U+2014 em-dash before "small". Project CLAUDE.md forbids em-dashes catalog-wide. | PATCH `domains.id=94 business_logic` to `"PKI and crypto kernel for signature creation, timestamping, and validation, small in surface area but irreducible and regulated."`. Single PATCH, no user judgment required (rule-enforced). |
| B1A-S5 | **B10b hard fail** | Handoff 217 `source_domain_module_id` is NULL; target side is already 127. Fix lands once B1A-S1 creates the module. | PATCH `handoffs.id=217 source_domain_module_id=<new ESIGN-SIGNATURE-OPS id>` after B1A-S1. |
| B1A-S6 | **B11 hard fail** | Zero `data_object_aliases` for envelopes. Cross-vendor synonyms (agreement, signing_session, transaction) are catalog-wide synonyms for the same concept. | Insert `data_object_aliases` rows for `agreement`, `signing_session`, `transaction`. `alias_type` per the catalog enum (`/fields?table_name=eq.data_object_aliases&field_name=eq.alias_type` at fix time). |
| B1A-S7 | **F7 hard fail (Rule #15 + em-dash violation)** | `skill_tools.id=254` notes contain a U+2014 em-dash and an auto-populated channel-justification trailer; `skill_tools.id=255` notes contain an auto-populated workflow-context trailer. Rule #15 forbids notes without per-row user-approved wording. | Default fix once B2-S3 lands: PATCH both rows' `notes` to empty string and treat F7 satisfied via the per-row workflow-context recorded in the audit conversation. Gated on Bucket 2 (B2-S3). |
| B1A-S8 | **F1 (post-M1)** | Once B1A-S1 lands, the legacy `esign-system` skill 20 (`domain_module_id=null`) flips from transitional to outright F1 fail. | Preferred: PATCH `skills.id=20 domain_module_id=<new>` and rename `skill_name='esign_signature_ops_agent'`, preserving the 6 `skill_tools` rows. Gated on B1A-S1. |
| B1A-S9 | **M4 + M6 closure (post-M1)** | After B1A-S1 + B1A-S2, every capability must have ≥1 realizing module and every module must realize ≥1 capability. | Mechanical: `domain_module_capabilities` rows linking each new capability to the new module. |
| B1A-S10 | **M5 closure (post-M1)** | All 8 envelope lifecycle states have `domain_module_id=null`. With the module created, the workflow-gate states (and ideally every state) carry the realizing module FK. | PATCH every `data_object_lifecycle_states` row (435-442) for envelopes `domain_module_id=<new>`. |
| B1A-S11 | **Permission materialization (post-M1)** | Module-level permissions do not exist (0 esign permissions). | Author baseline `esign-signature-ops:read|manage|admin` (`baseline-read / -manage / -admin`) plus workflow-gate `esign-signature-ops:send_envelope` and `:void_envelope` (one per `requires_permission=true` state). Mechanical after S1 + S10. |
| B1A-S12 | **M8 catalog UX (post-M1)** | Module-level `catalog_tagline` + `catalog_description` are both empty by construction (no module). | Draft per Rule #20 buyer voice, surface for user approval, then PATCH. Write gated on user approval. |

#### BOUNDARY findings per neighbor (Pass 4 pairwise reconciliation)

**CLM to ESIGN (weight 3).** Wired pairs: 1 outbound (217 ESIGN to CLM on `envelope.completed`). Section 1 (existing fully wired): 0 (217 has NULL source_domain_module_id, ESIGN owes the fix per B10b). Section 2 (NULL FK candidates): 217 itself, fix is B1A-S5. Section 3 (missing handoffs the catalog implies): a candidate is CLM to ESIGN on `legal_contract.sent_for_signature` (the source event does not yet exist on legal_contracts); the inverse cross-relationship `legal_contracts triggers envelopes` is also missing from `data_object_relationships`. CLM-REPOSITORY consumes envelopes as `consumer + optional` (DMDO 127) but the publisher direction `legal_contracts to envelopes` is not encoded. Owed by CLM's B8 outbound pass. Section 4 (boundary integrity): healthy. Section 5 (cross-relationship mirror): the existing 518 (`envelopes yields signature_records`, owner_side=source=ESIGN) is the correct outbound shape; no inverse mirror required.

#### APQC TAGGING

H1 process side-bar: 1 of 1 cross-domain handoffs tagged (`agent_curated` row 204 pointing at process 398). Catalog quality (record_status='approved'): 0. The agent does NOT propose to flip 204 to approved (Rule #1 user-judgment, surfaces as B2-S6).

| handoff_id | source to target | trigger_event | payload | Current PCF row | confidence | Action |
|---|---|---|---|---|---|---|
| 217 | ESIGN to CLM-REPOSITORY | envelope.completed | envelopes | 398 "Negotiate and document agreements/contracts" L3 (11052) | confident | None this pass; B2-S6 surfaces the approval flip. |

#### Cross-domain relationships report-only

ESIGN publishes 1 outbound cross-relationship (518). Inbound relationship coverage remains sparse (0 rows). Bucket 3 candidate B3-S6 names the inbound mirrors owed by other domains.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **A4 catalog UX wording (domain grain).** Both `domains.catalog_tagline` and `domains.catalog_description` are empty. | Rule #20 requires editorial buyer-voice copy and user approval before any write. | (a) User supplies tagline (single sentence) and description (1-3 paragraphs). (b) User asks agent to draft and approve verbatim, then write. |
| B2-S2 | **Module split decision (gates B1A-S1).** Single `ESIGN-SIGNATURE-OPS` or two-module `ESIGN-AUTHORING` + `ESIGN-COMPLETION`. Agent recommends single (point-solution market, single product per flagship vendor). | Module-shape design call; not a structural fact. | (a) Single module (recommended). (b) Two-module split (unlocks E1 role floor at the cost of authoring 2 system skills). |
| B2-S3 | **F7 / Rule #15 disposition on skill_tools.id 254 + 255 notes.** Both rows carry auto-populated notes; 254 contains an em-dash. | Rule #15 requires user-approved wording on any retained notes; F7 requires per-row workflow-context if the channel primitive is kept. | (a) Revert both rows' `notes` to empty string; treat F7 satisfied via this audit conversation (default). (b) Supply user-approved wording for each row (must not contain em-dash). (c) Replace `sign_document` (42) and / or `send_email` (37) with the `notify_person` abstraction; deferred to a later F7-scope conversation. |
| B2-S4 | **B12 lifecycle gate scope.** `voided` is already a gate (state 441). Should `declined` (state 440) ALSO carry a `requires_permission=true` (operator-decline scenario)? `expired` (442) is clock-triggered and typically NOT gated. Agent recommends gate only `voided`. | Workflow-shape judgment. | (a) Gate only `voided` and `sent` (status quo). (b) Also gate `declined`. (c) Also gate `expired`. |
| B2-S5 | **B7 user-edge scope.** Currently 2 edges loaded (sender, signer). Should `witness` (notarization flows), `cc_viewer` (signer convenience), `verifier` (qualified-e-signature identity reviewer) be added? | Workflow-shape judgment. | (a) Status quo (sender + signer only). (b) Add witness. (c) Add cc_viewer. (d) Add verifier. (e) Combination (specify). |
| B2-S6 | **H1 approval flip on `handoff_processes.id=204`.** Process 398 ("Negotiate and document agreements/contracts" L3) is a confident match for `envelope.completed`. Tag is `agent_curated` + `record_status=new`. | Rule #1 forbids the agent from setting `record_status=approved` without explicit user confirmation. | (a) Approve row 204 (PATCH `record_status='approved'`). (b) Keep at `new`. (c) Reject (`record_status='rejected'`). |

### Bucket 3, Phase 0 pending (speculative)

This is a structural Validate b1 (no subagent run). The candidates below come from the prior audit's flagship-vendor inventory and remain unverified.

| ID | Candidate | Vendor knowledge basis | Proposed module / table | Class |
|---|---|---|---|---|
| B3-S1 | `signature_certificates` master | DocuSign Certificate of Completion, Adobe Acrobat Sign Audit Report, PandaDoc Audit Trail. PKI signature + audit-trail bundle often modeled as a distinct long-lived evidence-package record. | new entity, ESIGN-SIGNATURE-OPS (master), kind=domain_owned | entity |
| B3-S2 | `envelope_templates` master | DocuSign Templates, Adobe Acrobat Sign Templates, PandaDoc Templates. Reusable envelope blueprints with recipient roles, field placements, default expiration. | new entity, ESIGN-SIGNATURE-OPS (master) | entity |
| B3-S3 | `identity_verifications` master | DocuSign Identity Verification, Adobe Acrobat Sign Identity Verification, OneSpan Sign Notary. Per-signer identity-verification attempt records. | new entity, ESIGN-SIGNATURE-OPS (master) | entity |
| B3-S4 | `ESIGN-NOTARY` capability or candidate domain | DocuSign Notary, OneSpan Notary, Notarize.com, BlueNotary, NotaryCam. Remote Online Notarization is regulated atop e-signature. | new capability linked to ESIGN, or candidate domain entry in `_missing-domains.md` | capability or candidate domain |
| B3-S5 | `ESIGN Act` (15 USC ch. 96) + UETA as regulations | Not in catalog. US federal + state statutory anchors for non-EU jurisdictions. | new `regulations` rows | regulation |
| B3-S6 | Inbound cross-domain handoffs ESIGN does not consume | CRM `crm_opportunity.closed_won`, ATS `job_offer.extended`, LEGAL-PRACT-MGMT `engagement_letter.drafted`, ACCT-PRACT-MGMT `engagement_letter.signed`, S2P `purchase_order.issued`, HCM `onboarding_doc.assigned`, RE-CRE `commercial_lease.drafted`, SUB-MGMT `customer_subscription.contract_drafted` to ESIGN; inverse `data_object_relationships` rows on each source master. | handoffs + relationships authored on each source domain's B9 / B8 outbound pass | handoffs + relationships (other domains' work) |

#### Candidate-domain queue

0 domain-tier candidates this pass. `ESIGN-NOTARY` is the closest but typically a capability layer; verify in Phase 0 if the user picks the vetted route.

### Cross-bucket dependencies

- **B1A-S2, S5, S7, S8, S9, S10, S11, S12** all depend on **B1A-S1**. B1A-S1 depends on B2-S2.
- **B1A-S3 / S4 / S6** are independent of S1.
- **B1A-S7** depends on **B2-S3**.
- **B1A-S11 / S12** depend on S1 + S2 and additionally Rule #20 / Rule #1 user approval for the catalog UX write and any `record_status` flip.
- **B2-S1** is independent of every other bucket; pure editorial.
- **B2-S2** gates B1A-S1.
- **B2-S4** shapes the eventual lifecycle gate set (M5 portion of S10).
- **B2-S5** shapes B7 (no new B1A item created this pass; would surface if S5 expands).
- **B2-S6** is a Rule #1 record_status flip on row 204; orthogonal to S1.
- **B3-S6** inbound candidates are owed by other domains' audits.
- Otherwise Buckets 2 and 3 are independent.

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed work |
|---|---|
| CLM | B8 outbound: author `data_object_relationships` row for `legal_contracts triggers envelopes`. CLM-REPOSITORY consumes envelopes as DMDO `consumer + optional` but the publisher edge is missing. |
| CRM | B9 + B8 outbound: handoff `crm_opportunity.closed_won` to ESIGN, plus `crm_opportunities triggers envelopes` relationship row. |
| ATS | B9 + B8 outbound: handoff `job_offer.extended`, plus `job_offers triggers envelopes`. |
| LEGAL-PRACT-MGMT | B9 + B8 outbound: handoff `engagement_letter.drafted` or `.sent_for_signature`, plus `engagement_letters triggers envelopes`. |
| ACCT-PRACT-MGMT | Same shape on `engagement_letter.signed`. |
| S2P | B9 + B8 outbound: handoff on `purchase_order.issued` or `sourcing_event.awarded`, plus relevant relationship row. |
| HCM | B9 + B8 outbound: handoff on `onboarding_doc.assigned` or equivalent. |
| RE-CRE | B9 + B8 outbound: handoff `commercial_lease.drafted` or `.sent_for_signature`, plus `commercial_leases triggers envelopes`. |
| SUB-MGMT | B9 + B8 outbound: handoff `customer_subscription.contract_drafted`. |

### Errors

None this run. No JWT-audience errors.

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
